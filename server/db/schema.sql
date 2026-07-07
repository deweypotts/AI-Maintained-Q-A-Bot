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

-- One persistent chat per technician.
create table chats (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references users(id),
  created_at timestamptz not null default now()
);

-- A bounded slice of a chat where a manager was pulled in, from the
-- escalation trigger to resolution (idle timeout or manager "Mark resolved").
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
