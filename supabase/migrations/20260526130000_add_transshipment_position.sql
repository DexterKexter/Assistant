alter table shipments
  add column if not exists transshipment_position text;

comment on column shipments.transshipment_position is 'before_border | after_border — где в маршруте перевалка';

-- Существующие перевалки: по умолчанию до границы (типичный кейс порт → Достык)
update shipments
set transshipment_position = 'before_border'
where transshipment_location is not null
  and trim(transshipment_location) <> ''
  and transshipment_position is null;
