"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";

// SECURITY: these back the Approve / Decline buttons. They run ONLY for the
// signed-in business owner and use the RLS-scoped client, so the database
// itself refuses any row that doesn't belong to the caller's business. We also
// restrict them to online requests so a crafted call can never delete or flip a
// normal manual rental.

function refresh() {
  revalidatePath("/requests");
  revalidatePath("/s/[slug]", "page");
  revalidatePath("/dashboard");
  revalidatePath("/rentals");
  revalidatePath("/calendar");
}

// Approve: confirm the online booking (it becomes a normal rental).
export async function approveRequest(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!id) return { ok: false, error: "Missing request." };
    const business = await requireBusiness();
    const supabase = createClient();
    const { error } = await supabase
      .from("rentals")
      .update({ approved: true })
      .eq("id", id)
      .eq("business_id", business.id)
      .eq("source", "online");
    if (error) return { ok: false, error: error.message };
    refresh();
    return { ok: true };
  } catch (e: any) {
    if (e?.message === "NO_BUSINESS") return { ok: false, error: "Please sign in again." };
    return { ok: false, error: e?.message || "Failed." };
  }
}

// Decline: permanently delete the online request so it does NOT linger in Rentals.
// Guarded to source = 'online' so it can never remove a confirmed manual rental.
export async function declineRequest(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!id) return { ok: false, error: "Missing request." };
    const business = await requireBusiness();
    const supabase = createClient();
    const { error } = await supabase
      .from("rentals")
      .delete()
      .eq("id", id)
      .eq("business_id", business.id)
      .eq("source", "online");
    if (error) return { ok: false, error: error.message };
    refresh();
    return { ok: true };
  } catch (e: any) {
    if (e?.message === "NO_BUSINESS") return { ok: false, error: "Please sign in again." };
    return { ok: false, error: e?.message || "Failed." };
  }
}
