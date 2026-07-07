import { Router } from 'express';

export const approvalsRouter = Router();

// TODO: list pending_kb_entries for the manager's queue
approvalsRouter.get('/', (req, res) => {
  res.status(501).json({ error: 'not implemented' });
});

// TODO: approve (optionally with edits) -> embed + insert into kb_entries
approvalsRouter.post('/:id/approve', (req, res) => {
  res.status(501).json({ error: 'not implemented' });
});

// TODO: dismiss a draft without publishing it
approvalsRouter.post('/:id/dismiss', (req, res) => {
  res.status(501).json({ error: 'not implemented' });
});
