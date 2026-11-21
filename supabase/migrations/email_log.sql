-- 2.H.5 — Notification reliability: a delivery log for every email we send.
-- Each send (confirmation, reminder, alert) writes one row with its outcome, so
-- a message that silently fails to reach a client is visible instead of lost.
-- Rows are written with the service-role key (bypasses RLS). Owners can read
-- their own business's rows. Safe to run more than once.

create table if not exists public.email_log (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete set null,
  user_id     uuid,
  kind        text not null,            -- 'booking_confirmed' | 'reminder_pickup' | 'reminder_return' | 'reminder_overdue' | 'new_booking' | 'suspicious_login'
  recipient   text,
  subject     text,
  status      text not null,            -- 'sent' | 'failed' | 'skipped'
  provider_id text,                     -- Resend message id when sent
  error       text,
  attempts    int  not null default 1,
  created_at  timestamptz not null default now()
);

create index if not exists idx_email_log_business on public.email_log (business_id, created_at desc);

alter table public.email_log enable row level security;

drop policy if exists "own email_log" on public.email_log;
create policy "own email_log" on public.email_log
  for select
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));
-- No insert/update/delete policy: writes happen only via the service-role key.
