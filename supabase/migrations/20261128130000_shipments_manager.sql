-- Responsible person per shipment: whoever creates it (if staff), changeable later.
alter table public.shipments add column manager_id uuid references public.profiles(id) on delete set null;
create index shipments_manager_id_idx on public.shipments(manager_id);

create or replace function public.shipments_default_manager() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- get_user_role() reads an unqualified "profiles", which breaks under search_path = ''.
  if new.manager_id is null and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager')) then
    new.manager_id := auth.uid();
  end if;
  return new;
end $$;
revoke all on function public.shipments_default_manager() from public, anon, authenticated;

create trigger shipments_default_manager
before insert on public.shipments
for each row execute function public.shipments_default_manager();

-- In-app notifications for the responsible person: on assignment and on status steps.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in
  ('task_assigned','task_comment','document_added','photo_added','shipment_status','shipment_comment','shipment_assigned'));

create or replace function public.notify_shipment_manager() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  num text := coalesce(new.container_number, 'перевозка');
  step text;
begin
  -- Nobody is told about their own actions.
  if new.manager_id is null or new.manager_id = auth.uid() then return new; end if;

  if tg_op = 'INSERT' or new.manager_id is distinct from old.manager_id then
    insert into public.notifications (user_id, type, message, shipment_id, actor_id)
    values (new.manager_id, 'shipment_assigned', 'Вы ответственный за ' || num, new.id, auth.uid());
    return new;
  end if;

  if (old.delivery_date is null and new.delivery_date is not null)
     or (not coalesce(old.is_completed, false) and new.is_completed) then step := 'доставлен';
  elsif old.arrival_date is null and new.arrival_date is not null then step := 'на границе';
  elsif old.departure_date is null and new.departure_date is not null then step := 'в пути';
  end if;

  if step is not null then
    insert into public.notifications (user_id, type, message, shipment_id, actor_id)
    values (new.manager_id, 'shipment_status', num || ': ' || step, new.id, auth.uid());
  end if;
  return new;
end $$;
revoke all on function public.notify_shipment_manager() from public, anon, authenticated;

create trigger shipments_notify_manager
after insert or update of manager_id, departure_date, arrival_date, delivery_date, is_completed on public.shipments
for each row execute function public.notify_shipment_manager();
