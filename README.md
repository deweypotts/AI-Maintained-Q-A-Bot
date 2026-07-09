# Applause

A mobile app for technicians and managers. Technicians ask a chatbot questions;
if the bot can't help, a manager is pulled inline into the same chat. Once the
exchange resolves, an AI pass proposes a knowledge base entry for the manager
to approve, so the next technician with the same question gets an instant answer.

## Structure

- `mobile/` — Expo (React Native + TypeScript) app, shared by technicians and managers
- `server/` — Node/Express + TypeScript API, Postgres + pgvector for the knowledge base

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
