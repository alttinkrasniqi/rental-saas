-- 2.H.4 — Financial deepening: payment kinds + (optional) deposit tracking
-- Makes the money trail append-only. Instead of silently editing a payment,
-- the owner records a *new* line item: a refund or a correction. Nothing is
-- ever overwritten, so the history is auditable.
--
-- Deposit tracking is OFF by default: in the Balkan car-rental market deposits
-- are rarely taken as collateral, so it stays out of the booking flow unless a
-- business turns it on in Settings (businesses.deposits_enabled).
--
-- Safe to run multiple times.

-- 0) Deposit tracking is opt-in, per business, default off.
alter table public.businesses
  add column if not exists deposits_enabled boolean not null default false;

-- 1) Payment kinds -----------------------------------------------------------
-- Every row in `payments` now carries a kind. Existing rows become 'payment'.
--   'payment'    — money received toward the rental total (positive amount)
--   'refund'     — money given back to the client        (negative amount)
--   'adjustment' — a manual correction                   (signed amount)
-- All three affect the rental balance (paid_cents) and count as cash in/out in
-- revenue reports, so a refund correctly lowers collected revenue for its day.
alter table public.payments
  add column if not exists kind text not null default 'payment';

-- 2) Deposit movements -------------------------------------------------------
-- The deposit is a separate pot from rental revenue: it is money held, not
-- earned. `rentals.deposit_cents` is the amount held; this table records what
-- later LEAVES that pot — either returned to the client or kept by the business
-- to cover damage / fuel / a late return. Deposit outstanding =
--   rentals.deposit_cents − sum(deposit_transactions.amount_cents).
-- These rows are intentionally NOT part of revenue reports (a kept deposit is
-- damage recovery, reported on its own), so existing revenue math is untouched.
create table if not exists public.deposit_transactions (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  rental_id    uuid not null references public.rentals (id) on delete cascade,
  kind         text not null,              -- 'return' | 'deduction'
  amount_cents int  not null,              -- positive magnitude leaving the pot
  reason       text,                       -- 'damage' | 'fuel' | 'late' | 'other' | free text
  created_at   timestamptz not null default now()
);

create index if not exists idx_deposit_tx_rental   on public.deposit_transactions (rental_id);
create index if not exists idx_deposit_tx_business on public.deposit_transactions (business_id);

alter table public.deposit_transactions enable row level security;

drop policy if exists "own deposit_transactions" on public.deposit_transactions;
create policy "own deposit_transactions" on public.deposit_transactions
  for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
