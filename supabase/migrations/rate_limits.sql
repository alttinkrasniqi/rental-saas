-- Run once in the Supabase SQL editor to enable rate limiting / brute-force protection.

create table if not exists public.rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

-- Not exposed to users; only the security-definer function below touches it.
alter table public.rate_limits enable row level security;

-- Atomically count one "hit" for a key inside a rolling window. Returns whether
-- the hit is allowed and, if not, how many seconds until the window resets.
create or replace function public.rate_limit_hit(p_key text, p_max int, p_window int)
returns table(allowed boolean, retry_after int)
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.rate_limits;
  now_ts timestamptz := now();
begin
  insert into public.rate_limits(key, count, window_start)
    values (p_key, 1, now_ts)
  on conflict (key) do update
    set count = case
          when public.rate_limits.window_start < now_ts - make_interval(secs => p_window)
          then 1 else public.rate_limits.count + 1 end,
        window_start = case
          when public.rate_limits.window_start < now_ts - make_interval(secs => p_window)
          then now_ts else public.rate_limits.window_start end
  returning * into rec;

  if rec.count > p_max then
    return query select false,
      greatest(0, ceil(extract(epoch from (rec.window_start + make_interval(secs => p_window) - now_ts))))::int;
  else
    return query select true, 0;
  end if;
end;
$$;

grant execute on function public.rate_limit_hit(text, int, int) to anon, authenticated, service_role;

-- Optional housekeeping: delete stale rows occasionally (or schedule a cron).
-- delete from public.rate_limits where window_start < now() - interval '1 day';
