alter table public.prices add column border text not null default '' check (length(border) <= 80);
