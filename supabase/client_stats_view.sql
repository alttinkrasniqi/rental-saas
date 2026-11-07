-- Per-client rental stats computed in the database (aggregation), so the
-- Clients page never has to pull every rental into the app just to show
-- "N rentals / spent / owed". Exposed as a view with security_invoker so the
-- caller's RLS on clients/rentals is enforced (no cross-tenant access even if
-- the view is hit directly through the REST API).
drop view if exists public.client_stats;

create view public.client_stats
with (security_invoker = on) as
select
  c.*,
  coalesce(s.rentals_count, 0)      as rentals_count,
  coalesce(s.spent_cents, 0)        as spent_cents,
  coalesce(s.outstanding_cents, 0)  as outstanding_cents,
  s.last_pickup                     as last_pickup,
  coalesce(o.out_now, false)        as out_now
from public.clients c
left join lateral (
  select
    count(*)                                   as rentals_count,
    sum(coalesce(r.paid_cents, 0))             as spent_cents,
    -- Owed = unpaid balance on rentals under way or finished; a future
    -- RESERVED rental isn't due yet, so it is excluded.
    sum(
      case when not (r.status = 'RESERVED' and r.pickup_at > now())
           then greatest(0, coalesce(r.total_cents, 0) - coalesce(r.paid_cents, 0))
           else 0 end
    )                                          as outstanding_cents,
    max(r.pickup_at)                           as last_pickup
  from public.rentals r
  where r.client_id = c.id and r.status <> 'CANCELLED'
) s on true
left join lateral (
  -- Does the client currently have a car out?
  select true as out_now
  from public.rentals r
  where r.client_id = c.id
    and r.status in ('ACTIVE', 'RESERVED')
    and r.pickup_at <= now()
    and (r.open_ended or r.return_at >= now())
  limit 1
) o on true;

grant select on public.client_stats to authenticated;
