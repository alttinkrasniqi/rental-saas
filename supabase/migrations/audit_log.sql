-- Run once in the Supabase SQL editor to enable the activity / audit log.

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  metadata jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_business_idx on public.audit_log(business_id, created_at desc);

alter table public.audit_log enable row level security;

-- Owners may read their own business's log. Writes happen via the service role
-- (server-side), so there is no insert policy.
drop policy if exists "own audit select" on public.audit_log;
create policy "own audit select" on public.audit_log
  for select using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
