-- Applause knowledge base schema
-- Run against a Postgres database with the pgvector extension available.

create extension if not exists vector;
create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('technician', 'manager')),
  created_at timestamptz not null default now()
);

-- A technician can have many chats (conversations), started from their inbox.
create table chats (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references users(id),
  created_at timestamptz not null default now()
);

-- A bounded slice of a chat where a manager was pulled in, from the
-- escalation trigger to resolution (technician confirms + manager approves
-- the drafted knowledge base entry).
create table episodes (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id),
  manager_id uuid references users(id),
  status text not null default 'open' check (status in ('open', 'resolved')),
  started_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id),
  episode_id uuid references episodes(id),
  sender text not null check (sender in ('technician', 'bot', 'manager', 'system')),
  text text not null,
  unverified boolean not null default false,
  -- 'all' (default) is visible to both roles. The bot's "are you done?"
  -- exchange with the technician is 'technician'-only (the manager never
  -- sees it); the KB draft review negotiation is 'manager'-only (the
  -- technician never sees it).
  visible_to text not null default 'all' check (visible_to in ('all', 'technician', 'manager')),
  created_at timestamptz not null default now()
);

-- AI-drafted KB entries awaiting manager approval, generated when an
-- episode resolves.
create table pending_kb_entries (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references episodes(id),
  question text not null,
  draft_answer text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  created_at timestamptz not null default now()
);

create table kb_entries (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  embedding vector(1536),
  tags text[] not null default '{}',
  source_episode_id uuid references episodes(id),
  approved_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index kb_entries_embedding_idx on kb_entries using hnsw (embedding vector_cosine_ops);
create index messages_chat_id_idx on messages (chat_id);
create index episodes_chat_id_idx on episodes (chat_id);

-- Tracks what the bot is waiting on next in a chat: confirming the
-- technician wants to end the conversation, or waiting on the manager to
-- approve/edit the drafted KB entry shown inline in the chat.
alter table chats add column pending_action text check (pending_action in ('confirm_end', 'review_kb'));
alter table chats add column pending_kb_entry_id uuid references pending_kb_entries(id);

-- When a manager last viewed this chat — used to compute the "unread"
-- technician message shown as the inbox preview.
alter table chats add column manager_read_at timestamptz;
