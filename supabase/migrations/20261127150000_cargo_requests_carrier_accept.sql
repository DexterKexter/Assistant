-- Set when someone in the carrier's Telegram group presses "Accepted" under the request.
alter table public.cargo_requests
  add column if not exists carrier_accepted_at timestamptz,
  add column if not exists carrier_accepted_by text;
