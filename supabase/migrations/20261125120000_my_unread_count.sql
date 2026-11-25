-- One round trip for the sidebar badge instead of one query per conversation.
-- security invoker: RLS on messages/conversation_members still applies.
create or replace function public.my_unread_count()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::int
  from public.conversation_members cm
  join public.messages m on m.conversation_id = cm.conversation_id
  where cm.profile_id = auth.uid()
    and m.created_at > cm.last_read_at
    and m.sender_id <> auth.uid()
$$;

grant execute on function public.my_unread_count() to authenticated;
