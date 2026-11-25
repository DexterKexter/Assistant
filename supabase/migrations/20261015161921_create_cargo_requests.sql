create table public.cargo_requests (
  id uuid primary key default gen_random_uuid(),
  request_number bigint generated always as identity unique,
  client_id uuid references public.clients(id) on delete set null,
  shipment_id uuid references public.shipments(id) on delete set null,
  client_name text not null check (length(trim(client_name)) between 1 and 120),
  phone text not null default '' check (length(phone) <= 40),
  container_number text check (container_number ~ '^[A-Z]{4}[0-9]{7}$'),
  container_size smallint not null default 40 check (container_size in (20,40)),
  origin text not null default '' check (length(origin) <= 160),
  destination text not null default '' check (length(destination) <= 160),
  loading_date date,
  status text not null default 'draft' check (status in ('draft','waiting','submitted','changes_requested','accepted')),
  notes text not null default '' check (length(notes) <= 3000),
  review_note text not null default '' check (length(review_note) <= 3000),
  is_demo boolean not null default false,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cargo_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cargo_requests(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  quantity numeric(12,3) not null check (quantity > 0),
  unit text not null default 'шт' check (unit in ('шт','компл','кг','м³')),
  packages integer check (packages >= 0),
  weight_kg numeric(12,3) check (weight_kg >= 0),
  volume_m3 numeric(12,3) check (volume_m3 >= 0),
  notes text not null default '' check (length(notes) <= 2000),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (id, request_id)
);

create table public.cargo_request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cargo_requests(id) on delete cascade,
  item_id uuid,
  kind text not null check (kind in ('photo','document')),
  storage_path text not null unique check (length(storage_path) between 1 and 500),
  file_name text not null check (length(file_name) between 1 and 255),
  mime_type text not null,
  byte_size bigint not null check (byte_size between 1 and 10485760),
  created_at timestamptz not null default now(),
  foreign key (item_id, request_id) references public.cargo_request_items(id, request_id) on delete cascade
);

create index cargo_requests_client_idx on public.cargo_requests(client_id);
create index cargo_requests_shipment_idx on public.cargo_requests(shipment_id);
create index cargo_requests_creator_idx on public.cargo_requests(created_by);
create index cargo_requests_created_idx on public.cargo_requests(created_at desc);
create index cargo_request_items_request_idx on public.cargo_request_items(request_id, position);
create index cargo_request_attachments_request_idx on public.cargo_request_attachments(request_id);
create index cargo_request_attachments_item_idx on public.cargo_request_attachments(item_id, request_id);

create trigger cargo_requests_updated_at before update on public.cargo_requests
for each row execute function public.update_updated_at();

alter table public.cargo_requests enable row level security;
alter table public.cargo_request_items enable row level security;
alter table public.cargo_request_attachments enable row level security;

revoke all on public.cargo_requests, public.cargo_request_items, public.cargo_request_attachments from anon, authenticated;
grant select, insert, update on public.cargo_requests, public.cargo_request_items, public.cargo_request_attachments to authenticated;
grant usage on sequence public.cargo_requests_request_number_seq to authenticated;

create policy cargo_requests_staff on public.cargo_requests for all to authenticated
using ((select public.get_user_role()) in ('admin','manager'))
with check ((select public.get_user_role()) in ('admin','manager'));
create policy cargo_request_items_staff on public.cargo_request_items for all to authenticated
using ((select public.get_user_role()) in ('admin','manager'))
with check ((select public.get_user_role()) in ('admin','manager'));
create policy cargo_request_attachments_staff on public.cargo_request_attachments for all to authenticated
using ((select public.get_user_role()) in ('admin','manager'))
with check ((select public.get_user_role()) in ('admin','manager'));

-- Demo records deliberately have no links to real clients or shipments.
do $$
declare request_id uuid;
begin
  insert into public.cargo_requests (client_name,container_number,origin,destination,loading_date,status,is_demo,notes)
  values ('Демо · Мебель для дома','BICU1234567','Гуаньчжоу','Алматы',current_date,'submitted',true,'Пример заполненной заявки. Все сведения вымышлены.') returning id into request_id;
  insert into public.cargo_request_items (request_id,name,quantity,unit,packages,weight_kg,volume_m3,position) values
  (request_id,'Обеденные стулья',48,'шт',12,240,3.6,0),
  (request_id,'Обеденные столы',8,'шт',8,320,4.8,1);

  insert into public.cargo_requests (client_name,origin,destination,status,is_demo,notes)
  values ('Демо · Торговое оборудование','Дубай','Астана','draft',true,'Пример черновика: номер контейнера ещё не указан.');

  insert into public.cargo_requests (client_name,container_number,container_size,origin,destination,loading_date,status,is_demo,notes)
  values ('Демо · Домашний текстиль','MSCU7654321',20,'Шанхай','Москва',current_date-2,'accepted',true,'Пример принятой заявки. Не является реальной перевозкой.') returning id into request_id;
  insert into public.cargo_request_items (request_id,name,quantity,unit,packages,weight_kg,volume_m3)
  values (request_id,'Комплекты постельного белья',200,'компл',20,380,2.4);
end $$;
