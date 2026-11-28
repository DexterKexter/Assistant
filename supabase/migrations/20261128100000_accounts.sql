-- Company money accounts (bank accounts, cash desks, cards). Archived instead of deleted.
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  kind text not null default 'bank' check (kind in ('bank', 'cash', 'card', 'other')),
  currency text not null default 'KZT' check (currency in ('KZT', 'USD', 'RUB', 'AED', 'CNY', 'EUR')),
  bank text check (length(bank) <= 120),
  number text check (length(number) <= 60),
  balance numeric(16, 2) not null default 0,
  notes text not null default '' check (length(notes) <= 1000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger accounts_updated_at before update on public.accounts for each row execute function public.update_updated_at();

alter table public.accounts enable row level security;
-- Same people as transactions: admins, managers, accountants.
create policy accounts_finance on public.accounts for all to authenticated
  using ((select public.get_user_role()) in ('admin', 'manager', 'accountant'))
  with check ((select public.get_user_role()) in ('admin', 'manager', 'accountant'));
