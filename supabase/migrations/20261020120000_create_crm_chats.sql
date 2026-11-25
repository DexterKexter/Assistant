-- CRM inbox: external chats (Telegram now, WhatsApp later) with clients.
create table public.crm_chats (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('telegram','whatsapp')),
  external_id text not null,            -- telegram chat_id / whatsapp phone
  name text not null default '',
  username text,
  phone text,
  client_id uuid references public.clients(id) on delete set null,
  last_message_text text,
  last_message_at timestamptz not null default now(),
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (channel, external_id)
);

create table public.crm_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.crm_chats(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  text text not null default '',
  sender_id uuid default auth.uid() references public.profiles(id) on delete set null,
  shipment_id uuid references public.shipments(id) on delete set null,
  created_at timestamptz not null default now()
);

create index crm_chats_last_idx on public.crm_chats(last_message_at desc);
create index crm_chats_client_idx on public.crm_chats(client_id);
create index crm_messages_chat_idx on public.crm_messages(chat_id, created_at);

alter table public.crm_chats enable row level security;
alter table public.crm_messages enable row level security;

revoke all on public.crm_chats, public.crm_messages from anon, authenticated;
grant select, insert, update on public.crm_chats, public.crm_messages to authenticated;

create policy crm_chats_staff on public.crm_chats for all to authenticated
using ((select public.get_user_role()) in ('admin','manager'))
with check ((select public.get_user_role()) in ('admin','manager'));
create policy crm_messages_staff on public.crm_messages for all to authenticated
using ((select public.get_user_role()) in ('admin','manager'))
with check ((select public.get_user_role()) in ('admin','manager'));

alter publication supabase_realtime add table public.crm_chats, public.crm_messages;
