-- 2.V.5 Win-back & loyalty settings (per business). Feature works with the
-- app defaults even before this runs; these columns let the owner tune them.
alter table public.businesses add column if not exists loyalty_min_rentals  int not null default 3;
alter table public.businesses add column if not exists winback_days         int not null default 60;
alter table public.businesses add column if not exists loyalty_discount_pct  int not null default 10;
