-- Where a request came from, and the WhatsApp chat it was created in.
alter table public.cargo_requests
  add column if not exists source text not null default 'manual' check (source in ('manual', 'site', 'whatsapp')),
  add column if not exists chat_id uuid references public.crm_chats(id) on delete set null;
create index if not exists cargo_requests_chat_idx on public.cargo_requests(chat_id);
