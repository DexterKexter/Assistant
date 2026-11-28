-- Responsible person per client; new shipments of that client inherit it.
-- Order: explicitly chosen → client's responsible → creator (if staff).
alter table public.clients add column manager_id uuid references public.profiles(id) on delete set null;

create or replace function public.shipments_default_manager() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.manager_id is null and new.client_id is not null then
    select c.manager_id into new.manager_id from public.clients c where c.id = new.client_id;
  end if;
  if new.manager_id is null and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager')) then
    new.manager_id := auth.uid();
  end if;
  return new;
end $$;
