import { createClient } from "@/lib/supabase/server";
import type { Business } from "./types";

// Resolves the currently logged-in Supabase user.
export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Resolves the business owned by the current user (one business per account in the MVP).
// Every tenant-scoped query relies on this. Row Level Security is the real guard;
// this simply gives us the id to attach to inserts and to read the business profile.
export async function getBusiness(): Promise<Business | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  return (data as Business | null) ?? null;
}

// Convenience: throws to a caller that expects a business to exist.
export async function requireBusiness(): Promise<Business> {
  const business = await getBusiness();
  if (!business) {
    throw new Error("NO_BUSINESS");
  }
  return business;
}
