import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { authRouter } from './routes/auth';
import { chatsRouter } from './routes/chats';
import { kbRouter } from './routes/kb';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/kb', kbRouter);

// Final safety net — without this, an error thrown/rejected anywhere in a
// route (bad input, DB error, Claude API failure) crashes the whole process
// instead of just failing that one request.
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).json({ error: 'internal server error' });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`Applause server listening on port ${port}`);
});
