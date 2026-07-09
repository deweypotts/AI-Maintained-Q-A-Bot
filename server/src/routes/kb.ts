import { Router } from 'express';
import { classifyEditReply, reviseKBEntry } from '../claude';
import { pool } from '../db';
import { asyncHandler } from '../lib/asyncHandler';
import { advanceReview } from '../lib/kbChat';

export const kbRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Finalizes a still-pending draft into the real knowledge base. Used both
// when the manager says "keep as is" and when they hand-edit and send —
// either way, acting on a pending entry from the Q&A tab means they're done
// reviewing it.
async function approvePendingEntry(pendingId: string, question: string, answer: string) {
  const pendingRow = await pool.query('select episode_id as "episodeId" from pending_kb_entries where id = $1', [pendingId]);
  const episodeId = pendingRow.rows[0].episodeId;

  await pool.query('insert into kb_entries (question, answer, source_episode_id) values ($1, $2, $3)', [
    question,
    answer,
    episodeId,
  ]);
  await pool.query("update pending_kb_entries set question = $2, draft_answer = $3, status = 'approved' where id = $1", [
    pendingId,
    question,
    answer,
  ]);

  // If some chat is mid-review of this exact draft, move it along instead of
  // leaving the manager stuck waiting on a prompt for an already-approved entry.
  const chatResult = await pool.query('select id from chats where pending_kb_entry_id = $1', [pendingId]);
  const chat = chatResult.rows[0];
  if (chat) {
    await advanceReview(chat.id, episodeId, pendingId);
  }
}

// Both approved kb_entries and still-pending drafts show up here so the
// manager can review/edit/delete either from one list.
kbRouter.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(`
    select id, question, answer, 'approved' as status, updated_at as "updatedAt"
    from kb_entries
    union all
    select id, question, draft_answer as answer, 'pending' as status, created_at as "updatedAt"
    from pending_kb_entries where status = 'pending'
    order by "updatedAt" desc
  `);
  res.json({ entries: result.rows });
}));

kbRouter.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: 'invalid id' });
    return;
  }

  const approved = await pool.query('delete from kb_entries where id = $1 returning id', [id]);
  if (approved.rows[0]) {
    res.json({ ok: true });
    return;
  }

  const pending = await pool.query("select episode_id as \"episodeId\" from pending_kb_entries where id = $1 and status = 'pending'", [
    id,
  ]);
  if (!pending.rows[0]) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  const { episodeId } = pending.rows[0];

  await pool.query("update pending_kb_entries set status = 'dismissed' where id = $1", [id]);

  // If some chat is mid-review of this exact draft, move it along instead of
  // leaving the manager stuck waiting on a prompt for a deleted entry.
  const chatResult = await pool.query('select id from chats where pending_kb_entry_id = $1', [id]);
  const chat = chatResult.rows[0];
  if (chat) {
    await advanceReview(chat.id, episodeId, id);
  }

  res.json({ ok: true });
}));

kbRouter.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { question, answer } = req.body as { question?: string; answer?: string };
  if (!UUID_RE.test(id) || !question?.trim() || !answer?.trim()) {
    res.status(400).json({ error: 'question and answer are required' });
    return;
  }

  const approved = await pool.query(
    'update kb_entries set question = $2, answer = $3, updated_at = now() where id = $1 returning id',
    [id, question.trim(), answer.trim()]
  );
  if (approved.rows[0]) {
    res.json({ ok: true });
    return;
  }

  const pending = await pool.query("select id from pending_kb_entries where id = $1 and status = 'pending'", [id]);
  if (!pending.rows[0]) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  await approvePendingEntry(id, question.trim(), answer.trim());
  res.json({ ok: true });
}));

// The conversational edit flow: manager taps a Q&A, the bot asks whether to
// save it as-is or edit it, and this classifies the reply into one of three
// outcomes described in the schema docstring below.
kbRouter.post('/:id/message', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body as { reply?: string };
  if (!UUID_RE.test(id) || !reply?.trim()) {
    res.status(400).json({ error: 'reply is required' });
    return;
  }

  const approvedResult = await pool.query('select question, answer from kb_entries where id = $1', [id]);
  let entry = approvedResult.rows[0] as { question: string; answer: string } | undefined;
  let isPending = false;

  if (!entry) {
    const pendingResult = await pool.query(
      "select question, draft_answer as answer from pending_kb_entries where id = $1 and status = 'pending'",
      [id]
    );
    entry = pendingResult.rows[0];
    isPending = true;
  }

  if (!entry) {
    res.status(404).json({ error: 'not found' });
    return;
  }

  const classification = await classifyEditReply(entry.question, entry.answer, reply);

  if (classification.intent === 'keep') {
    if (isPending) {
      await approvePendingEntry(id, entry.question, entry.answer);
    }
    res.json({ action: 'kept', message: 'Kept as is.' });
    return;
  }

  if (classification.intent === 'manual') {
    res.json({
      action: 'prefill',
      message: 'Sure — edit it below and send when ready.',
      question: entry.question,
      answer: entry.answer,
    });
    return;
  }

  const revised = await reviseKBEntry(entry.question, entry.answer, classification.instruction ?? reply);
  if (isPending) {
    await pool.query("update pending_kb_entries set question = $2, draft_answer = $3 where id = $1 and status = 'pending'", [
      id,
      revised.question,
      revised.answer,
    ]);
  } else {
    await pool.query('update kb_entries set question = $2, answer = $3, updated_at = now() where id = $1', [
      id,
      revised.question,
      revised.answer,
    ]);
  }

  res.json({ action: 'updated', message: 'Updated!', question: revised.question, answer: revised.answer });
}));
