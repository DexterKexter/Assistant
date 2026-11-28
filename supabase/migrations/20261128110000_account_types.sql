-- Account types are a user-editable list; accounts store the type's name.
create table if not exists public.account_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 40),
  created_at timestamptz not null default now()
);
alter table public.account_types enable row level security;
create policy account_types_finance on public.account_types for all to authenticated
  using ((select public.get_user_role()) in ('admin', 'manager', 'accountant'))
  with check ((select public.get_user_role()) in ('admin', 'manager', 'accountant'));
insert into public.account_types (name) values ('Банк'), ('Наличные'), ('Карта') on conflict do nothing;

alter table public.accounts drop constraint if exists accounts_kind_check;
alter table public.accounts alter column kind set default 'Банк';
alter table public.accounts add constraint accounts_kind_check check (length(trim(kind)) between 1 and 40);
