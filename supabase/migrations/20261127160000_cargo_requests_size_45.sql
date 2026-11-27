alter table public.cargo_requests drop constraint cargo_requests_container_size_check;
alter table public.cargo_requests add constraint cargo_requests_container_size_check check (container_size in (20, 40, 45));
