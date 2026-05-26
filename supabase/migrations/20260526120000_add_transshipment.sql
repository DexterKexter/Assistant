-- Optional transshipment (перевалка) between origin and border.
-- Safe for existing rows: both columns nullable.

alter table shipments
  add column if not exists transshipment_location text,
  add column if not exists transshipment_date date;

comment on column shipments.transshipment_location is 'Промежуточная перевалка (порт, склад) между отправлением и границей';
comment on column shipments.transshipment_date is 'Дата прибытия / прохождения перевалки';
