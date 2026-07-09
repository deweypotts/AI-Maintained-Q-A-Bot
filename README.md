# Self-Maintained Chatbot

A self-maintaining chatbot for field technicians. Technicians ask a chatbot
questions; if the bot can't help, a manager is pulled inline into the same
chat. Once the exchange resolves, an AI pass proposes a knowledge base entry
for the manager to approve, so the next technician with the same question
gets an instant answer — the knowledge base grows on its own from real
conversations instead of anyone writing docs by hand.

## How it works

1. **Technician asks a question.** Claude checks it against the existing
   knowledge base. If there's a genuine match, the bot answers immediately —
   no human involved.
2. **No match → escalate.** A manager is pulled into that same chat thread in
   real time (over WebSockets) to answer directly.
3. **Resolution.** Once the technician confirms their question is answered,
   Claude drafts a clean, reusable Q&A entry summarizing the exchange.
4. **Manager review.** The draft is shown inline in the chat — the manager
   can approve it as-is, ask for a conversational edit, or rewrite it by
   hand — all before it's saved.
5. **Approved entries** land in the knowledge base (Postgres + pgvector),
   so the next technician who asks something similar gets the AI's instant
   answer from step 1, closing the loop.

Chats update live for both sides over a WebSocket connection rather than
polling, and either side can delete a chat thread once it's no longer needed.

## Structure

- `mobile/` — Expo (React Native + TypeScript) app, shared by technicians and managers
- `server/` — Node/Express + TypeScript API, Postgres + pgvector for the knowledge base, Claude for matching/drafting/classification

## Running

Backend and mobile app run in separate terminals.

**Terminal 1 — backend:**

```
cd server
npm run dev
```

Requires Postgres (with pgvector) running and reachable via `DATABASE_URL` in `server/.env`.

**Terminal 2 — mobile app:**

```
cd mobile
npm start
```

Then press `w` for web, `a` for Android emulator, `i` for iOS simulator, or scan the QR code with Expo Go.

## Status

Early scaffold — see task list / conversation history for the current design.
