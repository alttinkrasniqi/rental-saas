-- 2.V.14 — Business expenses & cash.
-- A simple ledger of money going OUT of the business (fuel, service, salaries,
-- rent, parts, fines, cleaning…), optionally tied to a specific car so per-car
-- profitability (2.V.7) can later subtract real costs. `method` keeps cash vs
-- card/bank visible. Safe to run more than once.

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  vehicle_id   uuid references public.vehicles (id) on delete set null,
  category     text not null default 'other',   -- 'fuel'|'service'|'insurance'|'registration'|'salary'|'rent'|'parts'|'fine'|'cleaning'|'other'
  amount_cents int  not null default 0,
  expense_date date not null,
  method       text,                            -- 'cash'|'card'|'bank'|null
  vendor       text,
  notes        text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_expenses_business on public.expenses (business_id, expense_date desc);
create index if not exists idx_expenses_vehicle  on public.expenses (vehicle_id);

alter table public.expenses enable row level security;

drop policy if exists "own expenses" on public.expenses;
create policy "own expenses" on public.expenses
  for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
