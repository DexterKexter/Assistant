-- Auto-greeting is sent once per chat; AI labels who is writing and why.
alter table public.crm_chats
  add column greeted_at timestamptz,
  add column ai_category text check (ai_category in ('lead','status','partner','spam','other')),
  add column ai_summary text;

-- Chats that already exist must not get a greeting retroactively.
update public.crm_chats set greeted_at = now();
