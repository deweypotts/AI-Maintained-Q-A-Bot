# Applause

A mobile app for technicians and managers. Technicians ask a chatbot questions;
if the bot can't help, a manager is pulled inline into the same chat. Once the
exchange resolves, an AI pass proposes a knowledge base entry for the manager
to approve, so the next technician with the same question gets an instant answer.

## Structure

- `mobile/` — Expo (React Native + TypeScript) app, shared by technicians and managers
- `server/` — Node/Express + TypeScript API, Postgres + pgvector for the knowledge base

## Status

Early scaffold — see task list / conversation history for the current design.
