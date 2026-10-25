"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE } from "@/lib/i18n/dict";

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Persist the chosen UI language in a cookie (read by getLocale / the provider).
export async function setLocale(locale: "sq" | "en") {
  cookies().set(LOCALE_COOKIE, locale === "en" ? "en" : "sq", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
