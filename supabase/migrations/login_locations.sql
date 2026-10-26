-- Run this once in the Supabase SQL editor to enable anomalous-login detection.

create table if not exists public.login_locations (
  user_id uuid not null references auth.users(id) on delete cascade,
  country text not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (user_id, country)
);

alter table public.login_locations enable row level security;

drop policy if exists "own locations select" on public.login_locations;
create policy "own locations select" on public.login_locations
  for select using (user_id = auth.uid());

drop policy if exists "own locations insert" on public.login_locations;
create policy "own locations insert" on public.login_locations
  for insert with check (user_id = auth.uid());

drop policy if exists "own locations update" on public.login_locations;
create policy "own locations update" on public.login_locations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
