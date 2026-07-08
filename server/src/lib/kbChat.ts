import { pool } from '../db';

export type VisibleTo = 'all' | 'technician' | 'manager';
export type Sender = 'technician' | 'bot' | 'manager' | 'system';

export async function insertMessage(
  chatId: string,
  episodeId: string | null,
  sender: Sender,
  text: string,
  options: { unverified?: boolean; visibleTo?: VisibleTo } = {}
) {
  await pool.query(
    'insert into messages (chat_id, episode_id, sender, text, unverified, visible_to) values ($1, $2, $3, $4, $5, $6)',
    [chatId, episodeId, sender, text, options.unverified ?? false, options.visibleTo ?? 'all']
  );
}

export async function getChatState(chatId: string) {
  const result = await pool.query(
    'select pending_action as "pendingAction", pending_kb_entry_id as "pendingKbEntryId" from chats where id = $1',
    [chatId]
  );
  return result.rows[0] as { pendingAction: 'confirm_end' | 'review_kb' | null; pendingKbEntryId: string | null };
}

export async function setChatState(chatId: string, pendingAction: string | null, pendingKbEntryId: string | null) {
  await pool.query('update chats set pending_action = $2, pending_kb_entry_id = $3 where id = $1', [
    chatId,
    pendingAction,
    pendingKbEntryId,
  ]);
}

export function formatReviewPrompt(question: string, answer: string) {
  return `Here's what I'll add to the knowledge base:\n\nQ: ${question}\nA: ${answer}\n\nManager — does this look correct?`;
}

// Posts the next pending draft for this episode, or — if none remain —
// resolves the episode and announces completion to everyone.
export async function advanceReview(chatId: string, episodeId: string, justHandledId: string) {
  const nextResult = await pool.query(
    "select id, question, draft_answer as \"draftAnswer\" from pending_kb_entries where episode_id = $1 and status = 'pending' and id != $2 order by created_at asc limit 1",
    [episodeId, justHandledId]
  );
  const next = nextResult.rows[0];

  if (next) {
    await setChatState(chatId, 'review_kb', next.id);
    await insertMessage(chatId, episodeId, 'bot', formatReviewPrompt(next.question, next.draftAnswer), { visibleTo: 'manager' });
    return;
  }

  await pool.query("update episodes set status = 'resolved', resolved_at = now() where id = $1", [episodeId]);
  await setChatState(chatId, null, null);
  await insertMessage(chatId, episodeId, 'bot', 'The knowledge base has been updated!');
}
