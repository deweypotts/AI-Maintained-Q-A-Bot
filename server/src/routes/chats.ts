import { Router } from 'express';
import { classifyEditReply, detectsResolution, detectsYes, draftKBEntries, matchAgainstKB, reviseKBEntry } from '../claude';
import { pool } from '../db';
import { asyncHandler } from '../lib/asyncHandler';
import {
  advanceReview,
  formatRevisedReviewPrompt,
  formatReviewPrompt,
  getChatState,
  getTechnicianName,
  insertMessage,
  setChatState,
  VisibleTo,
} from '../lib/kbChat';
import { broadcastInboxUpdate } from '../lib/realtime';

export const chatsRouter = Router();

const NEGATIVE_FEEDBACK = /not helpful|didn.?t help|doesn.?t work|didn.?t work|wrong answer|that.?s not it/i;
const END_CHAT_PROMPT = 'Is your issue resolved?';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Reconstructs "Q: ...\nA: ..." text (what we prefill the manager's chat box
// with) back into separate fields. Falls back to treating the whole reply as
// the answer if they didn't keep the markers.
function parseHandEditedQA(text: string, fallbackQuestion: string): { question: string; answer: string } {
  const match = text.match(/^Q:\s*([\s\S]*?)\n+A:\s*([\s\S]*)$/i);
  if (match) {
    return { question: match[1].trim(), answer: match[2].trim() };
  }
  return { question: fallbackQuestion, answer: text.trim() };
}

async function getMessages(chatId: string, viewerRole: 'technician' | 'manager') {
  const hiddenFrom: VisibleTo = viewerRole === 'manager' ? 'technician' : 'manager';
  const result = await pool.query(
    `select id, sender, text, unverified, created_at as "createdAt"
     from messages
     where chat_id = $1 and visible_to != $2
     order by created_at asc`,
    [chatId, hiddenFrom]
  );
  return result.rows;
}

// Conversation list — either one technician's own conversations (?technicianId=)
// or every conversation across technicians (manager's inbox).
chatsRouter.get('/', asyncHandler(async (req, res) => {
  const raw = req.query.technicianId;
  const technicianId = typeof raw === 'string' && UUID_RE.test(raw) ? raw : null;
  const result = await pool.query(
    `
    select c.id,
           u.name as "technicianName",
           -- Placeholder until chats carry a real assigned manager.
           'Jeff' as "managerName",
           case
             when $1::uuid is not null then
               coalesce(
                 (select m.sender != 'technician' from messages m
                    where m.chat_id = c.id and m.visible_to != 'manager'
                    order by m.created_at desc limit 1),
                 false
               )
             else
               -- Only messages tied to an escalation (episode_id set) count —
               -- a bot answer the AI resolved on its own never needed the manager.
               exists(
                 select 1 from messages m
                 where m.chat_id = c.id and m.sender = 'technician' and m.visible_to != 'technician'
                   and m.episode_id is not null
                   and (c.manager_read_at is null or m.created_at > c.manager_read_at)
               )
           end as "hasUnread",
           case
             when $1::uuid is not null then
               (select text from messages m where m.chat_id = c.id and m.visible_to != 'manager' order by m.created_at desc limit 1)
             else
               coalesce(
                 (select text from messages m
                    where m.chat_id = c.id and m.sender = 'technician' and m.visible_to != 'technician'
                      and m.episode_id is not null
                      and (c.manager_read_at is null or m.created_at > c.manager_read_at)
                    order by m.created_at asc limit 1),
                 (select text from messages m where m.chat_id = c.id and m.visible_to != 'technician' and m.episode_id is not null order by m.created_at desc limit 1)
               )
           end as "lastMessagePreview",
           (select created_at from messages m where m.chat_id = c.id order by m.created_at desc limit 1) as "updatedAt"
    from chats c
    join users u on u.id = c.technician_id
    where $1::uuid is not null and c.technician_id = $1
       -- Manager inbox: only chats that actually escalated at some point —
       -- ones the AI fully resolved never needed the manager's attention.
       or $1::uuid is null and exists(select 1 from episodes e where e.chat_id = c.id)
    order by "updatedAt" desc nulls last
  `,
    [technicianId]
  );
  res.json({ chats: result.rows });
}));

chatsRouter.post('/', asyncHandler(async (req, res) => {
  const { technicianId } = req.body as { technicianId?: string };
  if (!technicianId || !UUID_RE.test(technicianId)) {
    res.status(400).json({ error: 'a valid technicianId is required' });
    return;
  }
  const inserted = await pool.query('insert into chats (technician_id) values ($1) returning id', [technicianId]);
  const chatId = inserted.rows[0].id;
  await insertMessage(chatId, null, 'bot', 'How can I help you today?');
  res.json({ chatId });
}));

chatsRouter.get('/:chatId', asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const role = req.query.role === 'manager' ? 'manager' : 'technician';
  if (!UUID_RE.test(chatId)) {
    res.status(400).json({ error: 'invalid chat id' });
    return;
  }
  const chatResult = await pool.query(
    `select c.id, u.name as "technicianName" from chats c join users u on u.id = c.technician_id where c.id = $1`,
    [chatId]
  );
  if (!chatResult.rows[0]) {
    res.status(404).json({ error: 'chat not found' });
    return;
  }

  const episodeResult = await pool.query("select id from episodes where chat_id = $1 and status = 'open'", [chatId]);
  const messages = await getMessages(chatId, role);
  res.json({ chat: chatResult.rows[0], escalated: episodeResult.rows.length > 0, messages });
}));

chatsRouter.delete('/:chatId', asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (!UUID_RE.test(chatId)) {
    res.status(400).json({ error: 'invalid chat id' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    // Approved kb_entries should survive the chat they originated from —
    // just drop the now-dangling link before the episode goes away.
    await client.query(
      'update kb_entries set source_episode_id = null where source_episode_id in (select id from episodes where chat_id = $1)',
      [chatId]
    );
    await client.query('update chats set pending_kb_entry_id = null where id = $1', [chatId]);
    await client.query('delete from pending_kb_entries where episode_id in (select id from episodes where chat_id = $1)', [
      chatId,
    ]);
    await client.query('delete from messages where chat_id = $1', [chatId]);
    await client.query('delete from episodes where chat_id = $1', [chatId]);
    const deleted = await client.query('delete from chats where id = $1 returning id', [chatId]);
    await client.query('commit');

    if (!deleted.rows[0]) {
      res.status(404).json({ error: 'chat not found' });
      return;
    }
    broadcastInboxUpdate();
    res.json({ ok: true });
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}));

chatsRouter.post('/:chatId/read', asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (!UUID_RE.test(chatId)) {
    res.status(400).json({ error: 'invalid chat id' });
    return;
  }
  await pool.query('update chats set manager_read_at = now() where id = $1', [chatId]);
  broadcastInboxUpdate();
  res.json({ ok: true });
}));

chatsRouter.post('/:chatId/messages', asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { sender, text } = req.body as { sender?: 'technician' | 'manager'; text?: string };
  if (!UUID_RE.test(chatId)) {
    res.status(400).json({ error: 'invalid chat id' });
    return;
  }
  if (!text?.trim() || (sender !== 'technician' && sender !== 'manager')) {
    res.status(400).json({ error: 'sender and text are required' });
    return;
  }

  const openEpisodeResult = await pool.query("select id from episodes where chat_id = $1 and status = 'open'", [
    chatId,
  ]);
  const openEpisode = openEpisodeResult.rows[0] as { id: string } | undefined;
  const chatState = await getChatState(chatId);

  if (sender === 'manager') {
    if (!openEpisode) {
      res.status(400).json({ error: 'no open episode for this chat' });
      return;
    }

    const inReview = chatState.pendingAction === 'review_kb' && chatState.pendingKbEntryId;
    const awaitingManualEdit = chatState.pendingAction === 'manual_edit_kb' && chatState.pendingKbEntryId;
    // While reviewing (or hand-editing) a draft, the manager's replies are
    // part of that private negotiation — the technician never sees them.
    const isPrivateNegotiation = inReview || awaitingManualEdit;
    await insertMessage(chatId, openEpisode.id, 'manager', text, { visibleTo: isPrivateNegotiation ? 'manager' : 'all' });

    let prefill: { question: string; answer: string } | null = null;

    if (awaitingManualEdit) {
      const pendingResult = await pool.query('select * from pending_kb_entries where id = $1', [chatState.pendingKbEntryId]);
      const pending = pendingResult.rows[0];
      // Their hand-edited text is the final answer — save it verbatim and
      // treat it as approved, same as the normal "looks good" path.
      const { question, answer } = parseHandEditedQA(text, pending.question);
      await pool.query('insert into kb_entries (question, answer, source_episode_id) values ($1, $2, $3)', [
        question,
        answer,
        pending.episode_id,
      ]);
      await pool.query("update pending_kb_entries set question = $2, draft_answer = $3, status = 'approved' where id = $1", [
        pending.id,
        question,
        answer,
      ]);
      await insertMessage(chatId, openEpisode.id, 'bot', 'Saved.', { visibleTo: 'manager' });
      await advanceReview(chatId, pending.episode_id, pending.id);
    } else if (inReview) {
      const pendingResult = await pool.query('select * from pending_kb_entries where id = $1', [chatState.pendingKbEntryId]);
      const pending = pendingResult.rows[0];
      const classification = await classifyEditReply(pending.question, pending.draft_answer, text);

      if (classification.intent === 'keep') {
        await pool.query('insert into kb_entries (question, answer, source_episode_id) values ($1, $2, $3)', [
          pending.question,
          pending.draft_answer,
          pending.episode_id,
        ]);
        await pool.query("update pending_kb_entries set status = 'approved' where id = $1", [pending.id]);
        await advanceReview(chatId, pending.episode_id, pending.id);
      } else if (classification.intent === 'manual') {
        await setChatState(chatId, 'manual_edit_kb', pending.id);
        await insertMessage(chatId, openEpisode.id, 'bot', 'Sure — edit it below and send when ready.', {
          visibleTo: 'manager',
        });
        prefill = { question: pending.question, answer: pending.draft_answer };
      } else {
        const revised = await reviseKBEntry(pending.question, pending.draft_answer, classification.instruction ?? text);
        await pool.query('update pending_kb_entries set question = $2, draft_answer = $3 where id = $1', [
          pending.id,
          revised.question,
          revised.answer,
        ]);
        await insertMessage(chatId, openEpisode.id, 'bot', formatRevisedReviewPrompt(revised.question, revised.answer), {
          visibleTo: 'manager',
        });
        // pending_action stays 'review_kb', same pendingKbEntryId
      }
    }

    res.json({ messages: await getMessages(chatId, 'manager'), escalated: true, prefill });
    return;
  }

  // sender === 'technician'
  if (openEpisode) {
    if (chatState.pendingAction === 'review_kb') {
      // Awaiting the manager — the bot stays quiet.
      await insertMessage(chatId, openEpisode.id, 'technician', text);
    } else if (chatState.pendingAction === 'confirm_end') {
      // The end-chat confirmation dance is between the technician and the
      // bot only — none of it (their yes/no, the bot's follow-up) should
      // reach the manager's view of this chat.
      await insertMessage(chatId, openEpisode.id, 'technician', text, { visibleTo: 'technician' });
      const yes = await detectsYes(END_CHAT_PROMPT, text);
      if (yes) {
        const episodeMessages = await pool.query(
          "select sender, text from messages where episode_id = $1 and sender != 'system' and visible_to = 'all' order by created_at asc",
          [openEpisode.id]
        );
        const conversationText = episodeMessages.rows.map((m) => `${m.sender}: ${m.text}`).join('\n');
        const drafts = await draftKBEntries(conversationText);

        let firstId: string | null = null;
        for (const draft of drafts) {
          const inserted = await pool.query(
            'insert into pending_kb_entries (episode_id, question, draft_answer) values ($1, $2, $3) returning id',
            [openEpisode.id, draft.question, draft.answer]
          );
          if (!firstId) firstId = inserted.rows[0].id;
        }

        await setChatState(chatId, 'review_kb', firstId);
        const technicianName = await getTechnicianName(chatId);
        await insertMessage(chatId, openEpisode.id, 'bot', formatReviewPrompt(technicianName, drafts[0].question, drafts[0].answer), {
          visibleTo: 'manager',
        });
      } else {
        await setChatState(chatId, null, null);
        await insertMessage(chatId, openEpisode.id, 'bot', 'Okay, your manager will continue to help.', {
          visibleTo: 'technician',
        });
      }
    } else {
      await insertMessage(chatId, openEpisode.id, 'technician', text);
      const recentResult = await pool.query(
        'select sender, text from messages where chat_id = $1 order by created_at desc limit 6',
        [chatId]
      );
      const context = recentResult.rows.reverse().map((m) => `${m.sender}: ${m.text}`).join('\n');
      const resolved = await detectsResolution(context, text);
      if (resolved) {
        await setChatState(chatId, 'confirm_end', null);
        await insertMessage(chatId, openEpisode.id, 'bot', END_CHAT_PROMPT, { visibleTo: 'technician' });
      }
      // else: manager is handling it, the bot stays quiet.
    }

    res.json({ messages: await getMessages(chatId, 'technician'), escalated: true });
    return;
  }

  const kbResult = await pool.query('select id, question, answer from kb_entries order by created_at desc limit 50');
  const { matchId, answer } = await matchAgainstKB(text, kbResult.rows);
  const rejectPriorAnswer = NEGATIVE_FEEDBACK.test(text);

  if (matchId && answer && !rejectPriorAnswer) {
    await insertMessage(chatId, null, 'technician', text);
    await insertMessage(chatId, null, 'bot', answer);
    res.json({ messages: await getMessages(chatId, 'technician'), escalated: false });
    return;
  }

  // No KB match (or the technician rejected a prior answer) — escalate.
  const newEpisode = await pool.query("insert into episodes (chat_id, status) values ($1, 'open') returning id", [
    chatId,
  ]);
  const episodeId = newEpisode.rows[0].id;

  await insertMessage(chatId, episodeId, 'technician', text);
  await insertMessage(chatId, episodeId, 'system', 'Answer not found - adding your manager to the chat.');

  res.json({ messages: await getMessages(chatId, 'technician'), escalated: true });
}));
