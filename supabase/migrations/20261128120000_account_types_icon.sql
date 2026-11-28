-- Icon key picked from a fixed set in the app (src/lib/account-icons.ts).
alter table public.account_types add column if not exists icon text not null default 'wallet' check (length(icon) <= 30);
update public.account_types set icon = 'landmark' where name = 'Банк';
update public.account_types set icon = 'banknote' where name = 'Наличные';
update public.account_types set icon = 'card' where name = 'Карта';
