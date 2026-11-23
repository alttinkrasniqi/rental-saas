-- 2.V.23 — Monthly revenue goal. A single recurring target per business; the
-- dashboard shows this month's collected revenue against it, with pace.
-- Safe to run more than once.
alter table public.businesses
  add column if not exists monthly_revenue_target_cents int not null default 0;
