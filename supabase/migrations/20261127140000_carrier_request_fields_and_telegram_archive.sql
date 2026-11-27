-- Shipper contact, reused every time this sender is picked on a cargo request.
alter table public.senders add column if not exists phone text;

-- Fields the carrier needs in the Telegram request message.
alter table public.cargo_requests
  add column if not exists sender_id uuid references public.senders(id) on delete set null,
  add column if not exists weight_kg numeric,
  add column if not exists container_owner text check (container_owner in ('SOC', 'COC')),
  add column if not exists via text,
  add column if not exists shipper_phone text;

-- Archive of everything said in carrier Telegram groups. Files are kept as Telegram file_id, not downloaded.
create table if not exists public.telegram_messages (
  id bigint generated always as identity primary key,
  chat_id bigint not null,
  message_id bigint not null,
  from_id bigint,
  from_name text not null default '',
  text text,
  file_id text,
  reply_to_message_id bigint,
  sent_at timestamptz not null,
  unique (chat_id, message_id)
);
create index if not exists telegram_messages_chat_idx on public.telegram_messages(chat_id, sent_at);

alter table public.telegram_messages enable row level security;
-- Read-only for staff; rows are written by the Telegram webhook (service role).
create policy telegram_messages_staff on public.telegram_messages for select to authenticated
  using ((select public.get_user_role()) in ('admin', 'manager'));
