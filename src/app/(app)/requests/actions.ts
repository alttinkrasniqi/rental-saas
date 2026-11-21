"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";
import { notifyBookingConfirmed } from "@/lib/notify";
import { formatMoney } from "@/lib/format";

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

    // Best-effort confirmation email to the client.
    try {
      const { data: r } = await supabase
        .from("rentals")
        .select("pickup_at, return_at, total_cents, open_ended, vehicle:vehicles(make, model, plate), client:clients(email)")
        .eq("id", id)
        .single();
      const row = r as any;
      const email = row?.client?.email;
      if (email) {
        const v = row.vehicle;
        await notifyBookingConfirmed({
          to: email,
          replyTo: business.email || undefined,
          businessName: business.name,
          businessPhone: business.phone,
          carName: v ? `${v.make} ${v.model}` : undefined,
          plate: v?.plate,
          from: row.pickup_at,
          to_date: row.return_at,
          totalText: row.open_ended ? null : row.total_cents ? formatMoney(row.total_cents, business.currency || "EUR") : null,
          openEnded: !!row.open_ended,
          businessId: business.id,
        });
      }
    } catch {}

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
