-- 2.H.9 — Handover lifecycle: mark when a car was actually handed to the client.
-- Lets the rental show "Dorëzim" before handover and only "Rikthim" after, and
-- makes "finish handover" a real state change (not just navigation).
-- Safe to run more than once.

alter table public.rentals
  add column if not exists handed_over_at timestamptz;
