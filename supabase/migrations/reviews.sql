-- 2.V.4 Reviews & reputation. Customers rate their experience; happy ones are
-- routed to Google, unhappy ones leave private feedback the owner reads here.
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  rating      int,                       -- 1..5
  comment     text,
  name        text,
  created_at  timestamptz not null default now()
);
create index if not exists reviews_business_idx on public.reviews (business_id, created_at desc);

alter table public.businesses add column if not exists google_review_url text;

alter table public.reviews enable row level security;
drop policy if exists "own reviews" on public.reviews;
create policy "own reviews" on public.reviews
  for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
