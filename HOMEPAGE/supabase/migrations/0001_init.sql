-- Leads captured by Rara, and anonymous chat logs (phone numbers redacted by the app).
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  whatsapp text not null,
  summary jsonb not null default '{}'::jsonb,
  transcript jsonb not null default '[]'::jsonb,
  session_id text
);

create table if not exists public.chat_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null
);
create index if not exists chat_logs_created_at_idx on public.chat_logs (created_at);

-- Only the server (service role) touches these tables.
alter table public.leads enable row level security;
alter table public.chat_logs enable row level security;

-- Delete anonymous chat logs older than 90 days, daily at 03:00 UTC.
create extension if not exists pg_cron;
select cron.schedule(
  'delete-old-chat-logs',
  '0 3 * * *',
  $$delete from public.chat_logs where created_at < now() - interval '90 days'$$
);
