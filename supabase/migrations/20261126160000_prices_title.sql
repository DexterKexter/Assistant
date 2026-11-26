alter table public.prices add column title text not null default '' check (length(title) <= 120);
