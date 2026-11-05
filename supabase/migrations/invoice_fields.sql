-- Run once in the Supabase SQL editor to enable invoices (Kosovo fiscal details).

-- Seller (business) fiscal identifiers shown on invoices.
alter table public.businesses add column if not exists fiscal_number text;   -- Numri Fiskal
alter table public.businesses add column if not exists business_no   text;   -- NUI / Numri i biznesit
alter table public.businesses add column if not exists vat_number    text;   -- Numri i TVSH-së
alter table public.businesses add column if not exists bank_name     text;
alter table public.businesses add column if not exists bank_iban     text;
alter table public.businesses add column if not exists vat_rate      int not null default 0;  -- % TVSH (0 = jo i regjistruar)

-- Sequential invoice number assigned when an invoice is issued for a rental.
alter table public.rentals add column if not exists invoice_no        int;
alter table public.rentals add column if not exists invoice_issued_at timestamptz;
