"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type OnboardingState = { error?: string };

// Turn a business name into a URL-safe slug (used in /s/<slug>).
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "biz";
}

// Find a slug not already taken (checks across all businesses via admin client).
async function uniqueSlug(base: string): Promise<string> {
  const admin = createAdminClient();
  let candidate = base;
  for (let i = 0; i < 50; i++) {
    const { data } = await admin
      .from("businesses")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  // extremely unlikely fallback
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function createBusiness(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const name = String(formData.get("name") || "").trim();
  const currency = String(formData.get("currency") || "EUR").trim() || "EUR";
  const timezone = String(formData.get("timezone") || "Europe/Tirane").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;

  if (!name) return { error: "Shkruaj emrin e biznesit." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (existing) redirect("/dashboard");

  const slug = await uniqueSlug(slugify(name));

  const { error } = await supabase.from("businesses").insert({
    owner_id: user.id,
    name,
    slug,
    currency,
    timezone,
    phone,
    address,
    email,
  });
  if (error) return { error: error.message };

  redirect("/dashboard");
}
