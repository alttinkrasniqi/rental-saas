"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE } from "@/lib/i18n/dict";

export async function logout() {
  const supabase = createClient();
  try {
    await supabase.auth.signOut();
  } catch {}

  // Belt-and-braces: make sure the Supabase auth cookies are actually gone,
  // otherwise the middleware sees a valid session and bounces back to /dashboard
  // (which looks like the page just "refreshing" instead of logging out).
  try {
    const store = cookies();
    for (const c of store.getAll()) {
      if (c.name.startsWith("sb-")) store.delete(c.name);
    }
  } catch {}

  redirect("/login");
}

// Persist the chosen UI language in a cookie (read by getLocale / the provider).
export async function setLocale(locale: "sq" | "en") {
  cookies().set(LOCALE_COOKIE, locale === "en" ? "en" : "sq", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

// Mark the welcome tour as seen for this account (so it never shows again).
export async function markWelcomeSeen() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("businesses").update({ welcome_seen: true }).eq("owner_id", user.id);
}
