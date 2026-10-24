# Putting RentFlow online — step by step (no coding needed)

This takes about 15–20 minutes. You'll create three free accounts (GitHub, Supabase,
Vercel), and you never have to write any code. Just follow along in order.

At the end you'll have a real web link (like `your-app.vercel.app`) that you and your
friend can open on any phone or computer, log in, and use every day.

---

## Part 1 — Put the code on GitHub (the code's home)

GitHub is where the app's code will live. Vercel reads it from there to build your site.

1. Go to **github.com** and click **Sign up**. Create a free account (or log in if you
   have one).
2. Click the **+** in the top-right corner → **New repository**.
3. **Repository name:** type `rentflow`. Leave everything else as-is. Make sure it's set
   to **Private** if you don't want it public (either works). Click **Create repository**.
4. On the next page, find the link that says **"uploading an existing file"** and click it.
5. On your computer, **unzip** the `rentflow.zip` file I sent you. You'll get a folder
   called `rentflow`. **Open that folder**, select **everything inside it** (all the files
   and folders — not the outer `rentflow` folder itself), and **drag it onto the GitHub
   page** where it says "Drag files here".
   - Tip: it's fine if it takes a minute. Wait until every file finishes uploading.
6. Scroll down and click the green **Commit changes** button.

Your code is now on GitHub. ✅

---

## Part 2 — Create your database (Supabase)

Supabase stores all your data (cars, clients, rentals) and handles login.

1. Go to **supabase.com** → **Start your project** → sign in (you can use your GitHub
   account to sign in — easiest).
2. Click **New project**.
   - **Name:** `rentflow`
   - **Database Password:** click **Generate a password** and then **copy it somewhere
     safe** (you won't need it often, but keep it).
   - **Region:** pick the one closest to Kosovo (e.g. **Central EU (Frankfurt)**).
   - Click **Create new project** and wait ~2 minutes while it sets up.
3. When it's ready, on the left sidebar click the **SQL Editor** icon (looks like a
   terminal/`>_`). Click **+ New query**.
4. Open the file `supabase/schema.sql` from the code (you can open it in any text editor,
   or view it on your GitHub repo). **Copy everything** in that file and **paste it** into
   the Supabase SQL editor. Click **Run** (bottom right). You should see "Success". This
   creates all your tables. ✅
5. Turn off email confirmation so login is instant:
   - Left sidebar → **Authentication** → **Sign In / Providers** (or **Providers → Email**).
   - Find **"Confirm email"** and **turn it OFF**. Save.
   - (This means you can log in right after signing up, without checking your email.)
6. Get your two keys (you'll paste these into Vercel next):
   - Left sidebar → **Project Settings** (gear icon) → **API**.
   - Copy the **Project URL** (looks like `https://abcd1234.supabase.co`).
   - Copy the **anon public** key (a long string under "Project API keys").
   - Keep this tab open, or paste both into a note for a moment.

---

## Part 3 — Deploy the app (Vercel)

Vercel turns the code into a live website, for free.

1. Go to **vercel.com** → **Sign Up** → choose **Continue with GitHub** (easiest — it
   connects to the code you uploaded).
2. On your Vercel dashboard, click **Add New… → Project**.
3. Find your **`rentflow`** repository in the list and click **Import**.
4. Before clicking Deploy, open the **Environment Variables** section and add these two
   (type the name on the left, paste the value on the right), exactly:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | *(the Project URL you copied from Supabase)* |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(the anon public key you copied from Supabase)* |

   Double-check there are no extra spaces.
5. Click **Deploy**. Wait 1–3 minutes. When it's done you'll see confetti and a link like
   `rentflow-xxxx.vercel.app`. That's your app! 🎉

---

## Part 4 — First run

1. Open your new Vercel link.
2. Click **Create one** and sign up with an email + password (this is the owner's login).
3. Fill in the business name (your friend's shop) → **Continue**.
4. You're in! Add a car, add a client, create a rental, and check the calendar.

### Put it on the iPhone home screen (feels like an app)
On the iPhone, open the link in **Safari** → tap the **Share** button → **Add to Home
Screen**. Now it opens full-screen like a normal app.

---

## Everyday use
- **New rental:** the blue **+ / New Rental** button (top-left on desktop, floating button
  on mobile).
- The **Dashboard** shows today's pickups, returns, and money in.
- The **Calendar** shows which cars are free — tap an empty day to book it.
- Open any rental to **record a payment**, **mark it returned**, **extend**, or **cancel**.

## If something goes wrong
- **Login says "wrong email or password" right after signing up:** make sure you turned
  **off "Confirm email"** in Supabase (Part 2, step 5), then sign up again.
- **A page shows an error after deploy:** it's almost always a mistyped environment
  variable. In Vercel → your project → **Settings → Environment Variables**, check both
  values match Supabase exactly, then go to **Deployments → … → Redeploy**.
- **Anything else:** send me the exact message you see and I'll sort it out.

## A note on times
Dates and times use your business timezone (your business timezone by default, changeable in
Settings). Pickups default to 09:00 and returns to 18:00 — you can change them on each
rental.
