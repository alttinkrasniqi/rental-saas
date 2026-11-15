-- Automatic reminders (2.4): a daily job emails clients a pickup reminder (the
-- day before), a return reminder (the day it's due) and an overdue notice. These
-- columns record when each reminder was sent so the job never repeats one.
--
-- Run this once in the Supabase SQL editor.

alter table public.rentals
  add column if not exists pickup_reminded_at  timestamptz,
  add column if not exists return_reminded_at  timestamptz,
  add column if not exists overdue_reminded_at timestamptz;
