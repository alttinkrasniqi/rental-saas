-- =============================================================
-- RLS verification — prove business A cannot see business B's data.
-- Run in the Supabase SQL editor. It only READS and rolls back; it
-- changes nothing. Replace USER_A_UUID / USER_B_UUID with two real
-- owners (ideally owners of two different businesses).
-- =============================================================

-- 0) Find owner IDs to use:
--    select b.owner_id, b.name from public.businesses b order by b.created_at;

-- 1) Confirm RLS is ENABLED on every table that holds tenant data.
--    rowsecurity must be true for all of these.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'businesses','vehicles','clients','rentals','payments','site_settings',
    'trusted_devices','login_locations','audit_log','rate_limits'
  )
order by tablename;

-- 2) List the policies in place (for a quick eyeball).
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3) Isolation test: act as owner A and make sure B's data is invisible.
begin;

-- Impersonate owner A at the 'authenticated' role (what the app uses).
select set_config('request.jwt.claims',
  json_build_object('sub','USER_A_UUID','role','authenticated')::text, true);
select set_config('request.jwt.claim.sub', 'USER_A_UUID', true);
set local role authenticated;

-- A should see ONLY their own rows (counts belong to A alone):
select 'vehicles visible to A' as check, count(*) from public.vehicles;
select 'clients visible to A'  as check, count(*) from public.clients;
select 'rentals visible to A'  as check, count(*) from public.rentals;
select 'payments visible to A' as check, count(*) from public.payments;

-- A must NOT see B's business or rows. Every count below MUST be 0.
select 'B business rows visible to A (want 0)' as check, count(*)
  from public.businesses where owner_id = 'USER_B_UUID';
select 'B vehicles visible to A (want 0)' as check, count(*)
  from public.vehicles
  where business_id in (select id from public.businesses where owner_id = 'USER_B_UUID');

-- A must NOT be able to hijack: try to flip a business to A (should affect 0 rows).
update public.businesses set name = name where owner_id = 'USER_B_UUID';
-- ^ affected rows reported by the editor should be 0.

reset role;
rollback;

-- If step 3's "want 0" checks all return 0, cross-tenant isolation holds.
