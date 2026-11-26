-- Automatic WhatsApp notifications about shipment status.
-- A trigger queues an event; a minutely job asks the app to send whatever is due.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Opt-in per client: nobody gets automatic messages until this is switched on.
alter table public.clients add column wa_notify boolean not null default false;

create table public.crm_notifications (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  event text not null check (event in ('created','departed','border','delivered')),
  status text not null default 'pending' check (status in ('pending','sent','failed','cancelled')),
  send_after timestamptz not null,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (shipment_id, event)  -- each event is announced once per shipment
);
create index crm_notifications_due_idx on public.crm_notifications(send_after) where status = 'pending';

alter table public.crm_notifications enable row level security;
revoke all on public.crm_notifications from anon, authenticated;
grant select on public.crm_notifications to authenticated;
create policy crm_notifications_staff on public.crm_notifications for select to authenticated
using ((select public.get_user_role()) in ('admin','manager'));

create or replace function public.queue_shipment_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  events text[] := '{}';
  e text;
  recent date := current_date - 7;  -- a date typed in for an old shipment is bookkeeping, not news
begin
  if new.client_id is null or not exists (select 1 from public.clients c where c.id = new.client_id and c.wa_notify) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    events := array['created'];
  else
    if old.departure_date is null and new.departure_date >= recent then events := events || 'departed'; end if;
    if old.arrival_date is null and new.arrival_date >= recent then events := events || 'border'; end if;
    if (old.delivery_date is null and new.delivery_date >= recent)
       or (not coalesce(old.is_completed, false) and new.is_completed and new.delivery_date is null) then
      events := events || 'delivered';
    end if;
  end if;

  foreach e in array events loop
    -- 10 minutes to notice and undo a mistaken date before the client hears about it.
    insert into public.crm_notifications (shipment_id, event, send_after)
    values (new.id, e, now() + interval '10 minutes')
    on conflict (shipment_id, event) do update
      set status = 'pending', send_after = excluded.send_after, error = null
      where public.crm_notifications.status = 'cancelled';
  end loop;
  return new;
end $$;

revoke all on function public.queue_shipment_notification() from public, anon, authenticated;

create trigger shipments_queue_notification
after insert or update of departure_date, arrival_date, delivery_date, is_completed on public.shipments
for each row execute function public.queue_shipment_notification();

-- Wake the app only when something is due. The endpoint takes no input and only drains this queue.
select cron.schedule('crm-notify', '* * * * *', $job$
  select net.http_post(url := 'https://crm.sti-cargo.com/api/crm/notify', body := '{}'::jsonb)
  where exists (select 1 from public.crm_notifications where status = 'pending' and send_after <= now())
$job$);
