# Setting up the product (fork from DORI) — step by step

This gets the **product** running on its own GitHub repo, Supabase project and
Vercel project, completely separate from DORI. Nothing you do here can affect
DORI's live site or data.

## What's already done in this code
- De-branded: no "DORI" text, logo or hardcoded emails/URLs. The product name
  comes from `NEXT_PUBLIC_APP_NAME` (defaults to "RentFlow" — change it).
- **Multi-tenant**: each business gets its own public booking page at
  `/s/<slug>`. The slug is generated automatically from the business name at
  signup. `PUBLIC_BUSINESS_ID` is gone.
- The management back-office (dashboard, cars, rentals, clients, calendar,
  reports, website builder, requests) all scope to the signed-in owner.
- Security fixes from the audit are baked in (auth on the website/requests
  actions; the booking email is HTML-escaped; plates are not sent to the public
  page).

## 1. GitHub
1. Create a new **private** repo (e.g. `rental-saas`).
2. Upload the contents of this folder to it (drag the files in via the GitHub
   web UI, or push with git). Do **not** include `node_modules` or `.next`.

## 2. Supabase (new project)
1. Create a new Supabase project (its own database, separate from DORI).
2. Open **SQL Editor → New query**, paste the whole of `supabase/schema.sql`,
   and click **Run**. This creates all tables, security rules, and the public
   `site` storage bucket. (Safe to run more than once.)
3. In **Project Settings → API**, copy: the Project URL, the `anon` public key,
   and the `service_role` key (keep this one secret).

## 3. Vercel (new project)
1. Import the new GitHub repo as a new Vercel project.
2. Add these Environment Variables (see `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_NAME` (your product name)
   - `NEXT_PUBLIC_APP_URL` (your deployment URL, e.g. the `*.vercel.app` one for now)
   - `RESEND_API_KEY` (a new Resend account/key for the product)
   - Optional: `MAIL_FROM`, `NOTIFY_EMAIL`
3. Deploy.

## 4. In Supabase Auth settings
- For the smoothest signup, turn **off** email confirmation (Authentication →
  Providers → Email). Then signup goes straight to onboarding.

## 5. First run (smoke test)
1. Visit your deployment → you'll land on **/login** → create an account via
   **Sign up**.
2. Onboarding asks for your business name → it creates the business and a slug.
3. Add a car or two (Cars → Add car), set a daily price.
4. Open your public booking page at **/s/&lt;your-slug&gt;** (also shown on the
   Settings page and the Website builder). Reserve a car as a test customer.
5. Back in the admin, check **Requests** → Approve/Decline works; the dashboard,
   calendar and rentals update.

## How each company's public site works
- A visitor goes to `yourproduct.com/s/<slug>`.
- The booking page loads that business's cars/settings and takes reservations.
- Online reservations appear under **Requests** (status pending) until the owner
  approves. The owner's own business email receives the notification.

## Things intentionally left for later (not blockers)
- **Custom domains per company** (e.g. a company using their own domain) — the
  slug model upgrades to this cleanly when you want it.
- The remaining audit items (double-booking DB constraint, booking rate-limit,
  "pending" badges on unapproved rentals, password reset). The optional
  no-overlap DB constraint is included in `schema.sql`, commented out.
- Replacing the sandbox email sender with your own verified domain in Resend.

## Changing the product name / colors
- Name: set `NEXT_PUBLIC_APP_NAME` (or edit `src/lib/brand.ts`).
- The public booking site's accent is a yellow (`#FED600`) carried over from the
  original; search for that value to restyle.
