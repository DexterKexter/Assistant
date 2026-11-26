-- Day the empty container was delivered for loading; loading should take no more than 5 days.
alter table public.shipments add column if not exists loading_date date;
