-- Pipeline stage "Экспорт": container is loaded and handed over for export, the ship has not left yet.
alter table public.shipments add column if not exists export_date date;
