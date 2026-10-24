-- =============================================================
-- Rental SaaS — database schema + security (Supabase / Postgres)
-- Multi-tenant: every business owner sees ONLY their own data.
-- Paste this whole file into Supabase -> SQL Editor -> New query -> Run.
-- It is safe to run more than once.
-- =============================================================

-- ---------- Extensions ----------
create extension if not exists btree_gist;     -- for the no-overlap booking guard (optional block below)

-- ---------- Tables ----------

create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  slug        text unique,                      -- used in the public URL /s/<slug>
  name        text not null,
  phone       text,
  email       text,
  address     text,
  currency    text not null default 'EUR',
  timezone    text not null default 'Europe/Tirane',
  created_at  timestamptz not null default now()
);

create table if not exists public.vehicles (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses (id) on delete cascade,
  make              text not null,
  model             text not null,
  year              int,
  plate             text not null,
  color             text,
  fuel_type         text,
  transmission      text,
  mileage           int,
  seats             int,
  doors             int,
  daily_price_cents int not null default 0,
  status            text not null default 'AVAILABLE',
  description       text,                        -- public-facing blurb
  photos            jsonb not null default '[]', -- array of public image URLs
  notes             text,
  archived          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.clients (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  full_name      text not null,
  phone          text,
  email          text,
  address        text,
  country        text,
  id_number      text,
  license_number text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.rentals (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses (id) on delete cascade,
  vehicle_id       uuid not null references public.vehicles (id) on delete restrict,
  client_id        uuid not null references public.clients (id) on delete restrict,
  status           text not null default 'ACTIVE',   -- RESERVED | ACTIVE | COMPLETED | CANCELLED
  source           text not null default 'manual',   -- 'manual' | 'online'
  approved         boolean not null default true,    -- online requests start false until approved
  open_ended       boolean not null default false,
  pickup_at        timestamptz not null,
  return_at        timestamptz not null,
  daily_rate_cents int not null default 0,
  total_cents      int not null default 0,
  deposit_cents    int not null default 0,
  paid_cents       int not null default 0,
  payment_method   text,
  returned_at      timestamptz,
  return_mileage   int,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  rental_id    uuid not null references public.rentals (id) on delete cascade,
  amount_cents int not null,
  method       text,
  paid_at      timestamptz not null default now(),
  note         text
);

-- Per-business website-builder content (one row per business).
create table if not exists public.site_settings (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  data        jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

-- ---------- Indexes ----------
create index if not exists idx_vehicles_business on public.vehicles (business_id);
create index if not exists idx_clients_business  on public.clients (business_id);
create index if not exists idx_rentals_business  on public.rentals (business_id);
create index if not exists idx_rentals_vehicle   on public.rentals (vehicle_id, pickup_at, return_at);
create index if not exists idx_payments_rental   on public.payments (rental_id);
create index if not exists idx_businesses_slug   on public.businesses (slug);

-- ---------- Row Level Security ----------
-- Every signed-in user can only ever touch data for a business they own.

alter table public.businesses    enable row level security;
alter table public.vehicles      enable row level security;
alter table public.clients       enable row level security;
alter table public.rentals       enable row level security;
alter table public.payments      enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "own businesses" on public.businesses;
create policy "own businesses" on public.businesses
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "own vehicles" on public.vehicles;
create policy "own vehicles" on public.vehicles
  for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists "own clients" on public.clients;
create policy "own clients" on public.clients
  for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists "own rentals" on public.rentals;
create policy "own rentals" on public.rentals
  for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists "own payments" on public.payments;
create policy "own payments" on public.payments
  for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists "own site_settings" on public.site_settings;
create policy "own site_settings" on public.site_settings
  for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- NOTE: the PUBLIC booking site reads cars/bookings/site_settings with the
-- service-role key (server-side only), which bypasses RLS. That is intentional
-- and safe: it only ever reads the single business resolved from the URL slug.

-- ---------- Storage: public bucket for logos / car photos ----------
insert into storage.buckets (id, name, public)
values ('site', 'site', true)
on conflict (id) do nothing;

-- Public read of the 'site' bucket (images are meant to be public).
drop policy if exists "public read site" on storage.objects;
create policy "public read site" on storage.objects
  for select using (bucket_id = 'site');
-- Writes happen only via the service-role key (server actions), so no
-- additional insert/update/delete policy is needed for end users.

-- ---------- OPTIONAL: hard database guard against double-booking ----------
-- Enable this once the app handles the resulting unique-violation gracefully.
-- It makes two overlapping OPEN rentals for the same car impossible at the DB level.
--
-- alter table public.rentals add constraint rentals_no_overlap
--   exclude using gist (
--     vehicle_id with =,
--     tstzrange(pickup_at, return_at) with &&
--   ) where (status in ('ACTIVE','RESERVED'));

-- Done.
