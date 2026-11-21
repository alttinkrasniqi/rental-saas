-- 2.H.1 — Hard database guard against double-booking.
-- Makes it impossible for two OPEN (ACTIVE/RESERVED) rentals of the SAME car to
-- have overlapping date ranges, no matter how the write arrives (office, public
-- site, future apps) or how many hit at once. The app still checks first for a
-- nice message; this is the safety net underneath. Safe to run more than once.

create extension if not exists btree_gist;

-- OPTIONAL pre-check — if the ALTER below fails with a conflict, you already
-- have overlapping open rentals. Run this to find them, then cancel/complete
-- one of each pair, and re-run this file:
--
--   select a.id as rental_a, b.id as rental_b, a.vehicle_id
--   from public.rentals a
--   join public.rentals b
--     on a.vehicle_id = b.vehicle_id
--    and a.id < b.id
--    and a.status in ('ACTIVE','RESERVED')
--    and b.status in ('ACTIVE','RESERVED')
--    and tstzrange(a.pickup_at, a.return_at) && tstzrange(b.pickup_at, b.return_at);

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
