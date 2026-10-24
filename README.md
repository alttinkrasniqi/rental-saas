# RentFlow (working name)

A multi-tenant SaaS for car-rental businesses: a management back-office (fleet,
rentals, clients, calendar, reports) plus a public booking website for each
business at `/s/<slug>`.

This is the **product** codebase — a clean, de-branded fork of the original
single-tenant DORI build. DORI runs on its own separate repo, Supabase project
and domain; nothing here is shared with it.

- Framework: Next.js 14 (App Router) · TypeScript · Tailwind
- Data/auth/storage: Supabase (Postgres + Auth + Storage)
- Email: Resend
- Hosting: Vercel

See **SETUP.md** for how to stand this up (GitHub → Supabase → Vercel).
Money is stored as integer cents. Default currency EUR; timezone is per-business.
