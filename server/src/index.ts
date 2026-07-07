import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { approvalsRouter } from './routes/approvals';
import { chatsRouter } from './routes/chats';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/chats', chatsRouter);
app.use('/api/approvals', approvalsRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`Applause server listening on port ${port}`);
});
