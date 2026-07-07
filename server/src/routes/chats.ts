import { Router } from 'express';

export const chatsRouter = Router();

// TODO: fetch the technician's persistent chat + message history
chatsRouter.get('/:chatId', (req, res) => {
  res.status(501).json({ error: 'not implemented' });
});

// TODO: append a technician message, run KB search / bot answer / escalation logic
chatsRouter.post('/:chatId/messages', (req, res) => {
  res.status(501).json({ error: 'not implemented' });
});

// TODO: manager taps "Mark resolved" — closes the open episode and kicks off
// the AI pass that drafts a pending_kb_entries row
chatsRouter.post('/:chatId/resolve', (req, res) => {
  res.status(501).json({ error: 'not implemented' });
});
