-- 2.V.17 — Vehicle document vault + VIN.
-- Stores scanned/photographed car documents (registration, insurance, inspection,
-- purchase) as an array of { path, label } on the vehicle, with the files in a
-- PRIVATE bucket served via short-lived signed URLs — same pattern as client
-- documents. Also adds the chassis/VIN number (prefills the cross-border
-- authorization). Safe to run more than once.

alter table public.vehicles add column if not exists documents jsonb not null default '[]';
alter table public.vehicles add column if not exists vin text;

-- PRIVATE bucket — never public. Uploads + signing happen with the service role.
insert into storage.buckets (id, name, public)
values ('vehicle-docs', 'vehicle-docs', false)
on conflict (id) do nothing;
