-- The Telegram assistant has no user session, so it runs read-only SQL as the service role.
grant execute on function public.execute_readonly_sql(text) to service_role;

-- Conversation memory of the Telegram assistant (last turns per private chat).
create table if not exists public.telegram_assistant_turns (
  id bigint generated always as identity primary key,
  chat_id bigint not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists telegram_assistant_turns_chat_idx on public.telegram_assistant_turns(chat_id, id desc);
-- No policies: only the bot (service role) reads and writes.
alter table public.telegram_assistant_turns enable row level security;
