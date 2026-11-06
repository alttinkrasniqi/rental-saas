-- Focal point for a car's cover photo, as a CSS object-position value
-- (e.g. "50% 30%"). Null means centered ("50% 50%"). Lets the owner choose
-- which part of the cover photo shows in the card / online, Facebook-style.
alter table public.vehicles add column if not exists cover_position text;
