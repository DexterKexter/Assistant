-- Managers link their site account to Telegram; the bot answers only linked admins/managers.
alter table public.profiles add column if not exists telegram_id bigint unique;

-- Carrier's Telegram group the bot posts cargo requests to.
alter table public.carriers add column if not exists telegram_chat_id bigint;
update public.carriers set telegram_chat_id = -1005600173745 where name = 'FOB GLOBAL CARGO';
update public.carriers set telegram_chat_id = -1005919486112 where name = 'ILOGISTIK';

-- Where the request was posted: stops duplicate sends and matches the carrier's replies.
alter table public.cargo_requests
  add column if not exists carrier_chat_id bigint,
  add column if not exists carrier_message_id bigint;

create table if not exists public.cargo_request_replies (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cargo_requests(id) on delete cascade,
  author text not null default '',
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists cargo_request_replies_request_idx on public.cargo_request_replies(request_id);

alter table public.cargo_request_replies enable row level security;
-- Read-only for staff; rows are written by the Telegram webhook (service role).
create policy cargo_request_replies_staff on public.cargo_request_replies for select to authenticated
  using ((select public.get_user_role()) in ('admin', 'manager'));
