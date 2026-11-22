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
  welcome_seen boolean not null default false,  -- first-login welcome tour shown?
  deposits_enabled boolean not null default false,  -- opt-in deposit tracking (off: not used in Balkan market)
  created_at  timestamptz not null default now()
);

-- For databases created before this column existed:
alter table public.businesses add column if not exists welcome_seen boolean not null default false;

-- Invoice / fiscal details (Kosovo).
alter table public.businesses add column if not exists fiscal_number text;
alter table public.businesses add column if not exists business_no   text;
alter table public.businesses add column if not exists vat_number    text;
alter table public.businesses add column if not exists bank_name     text;
alter table public.businesses add column if not exists bank_iban     text;
alter table public.businesses add column if not exists vat_rate      int not null default 0;
alter table public.rentals    add column if not exists invoice_no        int;
alter table public.rentals    add column if not exists invoice_issued_at timestamptz;

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
  documents         jsonb not null default '[]', -- private doc paths (2.V.17)
  vin               text,                        -- chassis / VIN number
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
  handed_over_at   timestamptz,                      -- set when the car is handed to the client (2.H.9)
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
  kind         text not null default 'payment',  -- 'payment' | 'refund' | 'adjustment'
  method       text,
  paid_at      timestamptz not null default now(),
  note         text
);

-- Deposit movements: what later leaves the held deposit (returned to the client
-- or kept to cover damage/fuel/late). Deposit held lives on rentals.deposit_cents;
-- outstanding = deposit_cents − sum(amount_cents here). Kept out of revenue.
create table if not exists public.deposit_transactions (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  rental_id    uuid not null references public.rentals (id) on delete cascade,
  kind         text not null,                    -- 'return' | 'deduction'
  amount_cents int  not null,                    -- positive magnitude leaving the pot
  reason       text,
  created_at   timestamptz not null default now()
);

-- Business expenses (2.V.14): money out, optionally tied to a car (feeds P&L).
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  vehicle_id   uuid references public.vehicles (id) on delete set null,
  category     text not null default 'other',
  amount_cents int  not null default 0,
  expense_date date not null,
  method       text,
  vendor       text,
  notes        text,
  created_at   timestamptz not null default now()
);

-- Traffic fines / tickets (2.V.12): recorded against a car + violation date,
-- auto-linked to the rental/client who had the car then.
create table if not exists public.traffic_fines (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  vehicle_id   uuid references public.vehicles (id) on delete set null,
  rental_id    uuid references public.rentals (id)  on delete set null,
  client_id    uuid references public.clients (id)  on delete set null,
  fine_date    date not null,
  amount_cents int  not null default 0,
  reference    text,
  location     text,
  notes        text,
  status       text not null default 'new',   -- 'new' | 'billed' | 'paid' | 'waived'
  created_at   timestamptz not null default now()
);

-- Delivery log for outgoing emails (2.H.5): one row per send with its outcome.
create table if not exists public.email_log (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete set null,
  user_id     uuid,
  kind        text not null,
  recipient   text,
  subject     text,
  status      text not null,            -- 'sent' | 'failed' | 'skipped'
  provider_id text,
  error       text,
  attempts    int  not null default 1,
  created_at  timestamptz not null default now()
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
create index if not exists idx_deposit_tx_rental on public.deposit_transactions (rental_id);
create index if not exists idx_businesses_slug   on public.businesses (slug);

-- ---------- Row Level Security ----------
-- Every signed-in user can only ever touch data for a business they own.

alter table public.businesses    enable row level security;
alter table public.vehicles      enable row level security;
alter table public.clients       enable row level security;
alter table public.rentals       enable row level security;
alter table public.payments      enable row level security;
alter table public.deposit_transactions enable row level security;
alter table public.traffic_fines enable row level security;
alter table public.expenses      enable row level security;
alter table public.email_log     enable row level security;
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

drop policy if exists "own deposit_transactions" on public.deposit_transactions;
create policy "own deposit_transactions" on public.deposit_transactions
  for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists "own expenses" on public.expenses;
create policy "own expenses" on public.expenses
  for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists "own traffic_fines" on public.traffic_fines;
create policy "own traffic_fines" on public.traffic_fines
  for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists "own email_log" on public.email_log;
create policy "own email_log" on public.email_log
  for select
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

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

-- ---------- Hard database guard against double-booking (2.H.1) ----------
-- Two overlapping OPEN rentals for the same car are impossible at the DB level.
-- The app catches the resulting exclusion violation and shows a friendly message
-- (see src/lib/db-errors.ts). Needs the btree_gist extension created above.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rentals_no_overlap') then
    alter table public.rentals add constraint rentals_no_overlap
      exclude using gist (
        vehicle_id with =,
        tstzrange(pickup_at, return_at) with &&
      ) where (status in ('ACTIVE','RESERVED'));
  end if;
end$$;

-- ---------- Trusted devices (new-device email verification) ----------
-- Records browsers a user has verified by email. The signed cookie is the
-- fast gate (checked in middleware); this table is for review/revocation.
create table if not exists public.trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null,
  label text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists trusted_devices_user_idx on public.trusted_devices(user_id);

alter table public.trusted_devices enable row level security;

-- A user may see and remove only their own devices. Inserts are done
-- server-side by the signed-in user (user_id must equal auth.uid()).
drop policy if exists "own devices select" on public.trusted_devices;
create policy "own devices select" on public.trusted_devices
  for select using (user_id = auth.uid());
drop policy if exists "own devices insert" on public.trusted_devices;
create policy "own devices insert" on public.trusted_devices
  for insert with check (user_id = auth.uid());
drop policy if exists "own devices delete" on public.trusted_devices;
create policy "own devices delete" on public.trusted_devices
  for delete using (user_id = auth.uid());

-- ---------- Known login locations (anomalous-login detection) ----------
-- The set of countries a user has logged in from. A login from a country not
-- in this set triggers an email-code challenge + alert.
create table if not exists public.login_locations (
  user_id uuid not null references auth.users(id) on delete cascade,
  country text not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (user_id, country)
);

alter table public.login_locations enable row level security;

drop policy if exists "own locations select" on public.login_locations;
create policy "own locations select" on public.login_locations
  for select using (user_id = auth.uid());
drop policy if exists "own locations insert" on public.login_locations;
create policy "own locations insert" on public.login_locations
  for insert with check (user_id = auth.uid());
drop policy if exists "own locations update" on public.login_locations;
create policy "own locations update" on public.login_locations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Done.
