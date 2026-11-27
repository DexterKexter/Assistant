-- Carrier picked when the request is created; the bot posts the request to that carrier's Telegram group.
alter table public.cargo_requests add column if not exists carrier_id uuid references public.carriers(id) on delete set null;
