-- 2.V.12 — Traffic fines & tickets.
-- A ticket usually arrives weeks after the rental. The owner records it against
-- the car and the violation date; the app finds which rental (and client) had
-- that car out then, so the cost can be billed to the right customer.
-- Safe to run more than once.

create table if not exists public.traffic_fines (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  vehicle_id   uuid references public.vehicles (id) on delete set null,
  rental_id    uuid references public.rentals (id)  on delete set null,
  client_id    uuid references public.clients (id)  on delete set null,
  fine_date    date not null,                 -- when the violation happened
  amount_cents int  not null default 0,
  reference    text,                          -- ticket / reference number
  location     text,
  notes        text,
  status       text not null default 'new',   -- 'new' | 'billed' | 'paid' | 'waived'
  created_at   timestamptz not null default now()
);

create index if not exists idx_traffic_fines_business on public.traffic_fines (business_id, created_at desc);
create index if not exists idx_traffic_fines_client   on public.traffic_fines (client_id);

alter table public.traffic_fines enable row level security;

drop policy if exists "own traffic_fines" on public.traffic_fines;
create policy "own traffic_fines" on public.traffic_fines
  for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
