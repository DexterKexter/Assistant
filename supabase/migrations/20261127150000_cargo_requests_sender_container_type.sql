-- Picked from the reference lists when a manager creates a request from a chat.
alter table public.cargo_requests
  add column if not exists sender_name text check (length(sender_name) <= 160),
  add column if not exists container_type text check (length(container_type) <= 40);
