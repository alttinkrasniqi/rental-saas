-- PRIVATE storage bucket for client documents (ID / passport / license photos).
-- These are personal data, so the bucket MUST stay private (public = false).
-- The app uploads with the service-role key and serves images via short-lived
-- signed URLs, so no public access is ever granted.
insert into storage.buckets (id, name, public)
values ('client-docs', 'client-docs', false)
on conflict (id) do nothing;
