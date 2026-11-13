-- Discount codes (2.10 Marketing): codes a customer/owner enters on a booking to
-- take a percentage or a fixed amount off the total. Optional validity window
-- (for flash sales), usage cap, and minimum rental total.
--
-- Run this once in the Supabase SQL editor.

create table if not exists public.promo_codes (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses (id) on delete cascade,
  code            text not null,                       -- stored uppercase
  discount_type   text not null check (discount_type in ('percent', 'fixed')),
  discount_value  integer not null,                    -- percent: 1..100 ; fixed: cents
  min_total_cents integer,                             -- optional minimum rental total
  valid_from      date,                                -- optional (flash-sale start)
  valid_to        date,                                -- optional (flash-sale end)
  max_uses        integer,                             -- optional total usage cap
  used_count      integer not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (business_id, code)
);

create index if not exists idx_promo_codes_business on public.promo_codes (business_id);

alter table public.promo_codes enable row level security;

drop policy if exists "own promo_codes" on public.promo_codes;
create policy "own promo_codes" on public.promo_codes
  for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- Record which code (and how much) was applied to a rental.
alter table public.rentals
  add column if not exists promo_code     text,
  add column if not exists discount_cents integer not null default 0;
