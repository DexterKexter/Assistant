-- Incoming WhatsApp media (photos, files) is copied into a private bucket; only staff can read it.
alter table public.crm_messages add column media_path text, add column media_type text;

insert into storage.buckets (id, name, public) values ('crm-media', 'crm-media', false) on conflict (id) do nothing;

create policy crm_media_staff_read on storage.objects for select to authenticated
using (bucket_id = 'crm-media' and (select public.get_user_role()) in ('admin','manager'));
