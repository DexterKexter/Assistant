-- Price list: one row per route + transport + container. Staff-maintained reference for quoting.
create table public.prices (
  id uuid primary key default gen_random_uuid(),
  origin text not null check (length(trim(origin)) between 1 and 160),
  destination text not null check (length(trim(destination)) between 1 and 160),
  transport text not null default '' check (length(transport) <= 80),
  container text not null default '' check (length(container) <= 40),
  price numeric(12,2) check (price >= 0),
  currency text not null default 'USD' check (currency in ('USD','KZT','RUB','AED','CNY','EUR')),
  transit_days text not null default '' check (length(transit_days) <= 40),
  notes text not null default '' check (length(notes) <= 2000),
  updated_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prices enable row level security;
revoke all on public.prices from anon, authenticated;
grant select, insert, update, delete on public.prices to authenticated;

create policy prices_staff on public.prices for all to authenticated
using ((select public.get_user_role()) in ('admin','manager'))
with check ((select public.get_user_role()) in ('admin','manager'));
