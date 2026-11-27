-- Extra details for senders (category = 'sender'): English name for carrier messages, phone, Google Maps link to the yard.
alter table public.reference_items
  add column if not exists name_en text check (length(name_en) <= 160),
  add column if not exists phone text check (length(phone) <= 40),
  add column if not exists maps_url text check (maps_url ~ '^https?://' and length(maps_url) <= 500);
