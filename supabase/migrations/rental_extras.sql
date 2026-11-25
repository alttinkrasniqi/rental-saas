-- 2.H.6 Extras & fees.
-- A per-business catalog of optional charges (extra driver, delivery, cleaning,
-- child seat…) that can be added to any rental, plus a snapshot of the chosen
-- extras stored on each rental so past rentals keep what was actually charged.

create table if not exists public.rental_extras (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name        text not null,
  kind        text not null default 'flat',   -- 'flat' (one-off) | 'per_day'
  unit_cents  int  not null default 0,
  active      boolean not null default true,
  sort        int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Chosen extras, snapshotted: [{ name, kind, unit_cents, qty, amount_cents }].
alter table public.rentals add column if not exists extras jsonb not null default '[]'::jsonb;

alter table public.rental_extras enable row level security;
drop policy if exists "own rental_extras" on public.rental_extras;
create policy "own rental_extras" on public.rental_extras
  for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
