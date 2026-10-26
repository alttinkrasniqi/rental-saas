-- Run this once in the Supabase SQL editor to enable new-device verification.

create table if not exists public.trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null,
  label text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists trusted_devices_user_idx on public.trusted_devices(user_id);

alter table public.trusted_devices enable row level security;

drop policy if exists "own devices select" on public.trusted_devices;
create policy "own devices select" on public.trusted_devices
  for select using (user_id = auth.uid());

drop policy if exists "own devices insert" on public.trusted_devices;
create policy "own devices insert" on public.trusted_devices
  for insert with check (user_id = auth.uid());

drop policy if exists "own devices delete" on public.trusted_devices;
create policy "own devices delete" on public.trusted_devices
  for delete using (user_id = auth.uid());
