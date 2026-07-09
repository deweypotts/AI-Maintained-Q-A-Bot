import { pool } from '../db';
import { broadcastChatUpdate, broadcastInboxUpdate } from './realtime';

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
  broadcastChatUpdate(chatId);
  broadcastInboxUpdate();
}

export async function getChatState(chatId: string) {
  const result = await pool.query(
    'select pending_action as "pendingAction", pending_kb_entry_id as "pendingKbEntryId" from chats where id = $1',
    [chatId]
  );
  return result.rows[0] as {
    pendingAction: 'confirm_end' | 'review_kb' | 'manual_edit_kb' | null;
    pendingKbEntryId: string | null;
  };
}

export async function setChatState(chatId: string, pendingAction: string | null, pendingKbEntryId: string | null) {
  await pool.query('update chats set pending_action = $2, pending_kb_entry_id = $3 where id = $1', [
    chatId,
    pendingAction,
    pendingKbEntryId,
  ]);
}

export async function getTechnicianName(chatId: string): Promise<string> {
  const result = await pool.query(
    'select u.name from chats c join users u on u.id = c.technician_id where c.id = $1',
    [chatId]
  );
  return result.rows[0]?.name ?? 'The technician';
}

export function formatReviewPrompt(technicianName: string, question: string, answer: string) {
  return `${technicianName} said that answered their question. I suggest adding this to the Q&A database.\n\nQ: ${question}\nA: ${answer}\n\nShould I add it? Or do you want an edit?`;
}

// Used when re-showing the *same* draft after the manager asked for a
// change — the "<name> said that answered their question" framing only
// makes sense the first time a given entry is proposed.
export function formatRevisedReviewPrompt(question: string, answer: string) {
  return `Here's the updated version:\n\nQ: ${question}\nA: ${answer}\n\nShould I add it? Or do you want an edit?`;
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
    const technicianName = await getTechnicianName(chatId);
    await setChatState(chatId, 'review_kb', next.id);
    await insertMessage(chatId, episodeId, 'bot', formatReviewPrompt(technicianName, next.question, next.draftAnswer), {
      visibleTo: 'manager',
    });
    return;
  }

  await pool.query("update episodes set status = 'resolved', resolved_at = now() where id = $1", [episodeId]);
  await setChatState(chatId, null, null);
  await insertMessage(chatId, episodeId, 'bot', 'The knowledge base has been updated!', { visibleTo: 'manager' });
}
