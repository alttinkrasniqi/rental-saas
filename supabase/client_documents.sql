-- Scanned/photographed documents for a client (ID, driver's license, etc.),
-- stored as an array of { url, label } objects. Label is a key: id | license | other.
alter table public.clients add column if not exists documents jsonb not null default '[]';
