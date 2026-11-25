-- One direct chat per pair of users: find the existing one or create it, atomically.
-- security definer so the lookup sees both members regardless of RLS; it only ever acts for auth.uid().
create or replace function public.get_or_create_dm(other_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv uuid;
begin
  if me is null or other_id is null or other_id = me then
    raise exception 'invalid participants';
  end if;
  -- Serialise concurrent calls for the same pair (double click, two tabs).
  perform pg_advisory_xact_lock(hashtextextended(least(me, other_id)::text || greatest(me, other_id)::text, 0));

  select c.id into conv
  from conversations c
  where c.type = 'dm'
    and exists (select 1 from conversation_members m where m.conversation_id = c.id and m.profile_id = me)
    and exists (select 1 from conversation_members m where m.conversation_id = c.id and m.profile_id = other_id)
  order by c.created_at
  limit 1;

  if conv is null then
    insert into conversations (type, created_by) values ('dm', me) returning id into conv;
    insert into conversation_members (conversation_id, profile_id) values (conv, me), (conv, other_id);
  end if;
  return conv;
end $$;

revoke all on function public.get_or_create_dm(uuid) from public, anon;
grant execute on function public.get_or_create_dm(uuid) to authenticated;
