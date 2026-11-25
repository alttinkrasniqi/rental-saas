-- 2.V.6 Lead capture: a customer who can't find a car for their dates leaves a
-- request. Public inserts come through the service-role (admin) client; the
-- owner reads/updates via RLS.
create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  name         text not null,
  phone        text,
  email        text,
  pickup_date  date,
  return_date  date,
  car_type     text,
  note         text,
  status       text not null default 'new',    -- 'new' | 'contacted' | 'converted' | 'closed'
  source       text not null default 'public', -- 'public' | 'manual'
  created_at   timestamptz not null default now()
);
create index if not exists leads_business_status_idx on public.leads (business_id, status);

alter table public.leads enable row level security;
drop policy if exists "own leads" on public.leads;
create policy "own leads" on public.leads
  for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
