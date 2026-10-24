"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/business";

export type CarDetails = {
  year: number | null;
  color: string | null;
  fuel_type: string | null;
  transmission: string | null;
  seats: number | null;
  doors: number | null;
  daily_price_cents: number;
  description: string | null;
};

// SECURITY: only the signed-in owner may edit a car, and only a car that
// belongs to THEIR business (scoped by the session's business id, not a
// client-supplied one).
export async function saveCarDetails(
  vehicleId: string,
  d: CarDetails
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!vehicleId) return { ok: false, error: "Missing car." };
    const business = await requireBusiness();
    const admin = createAdminClient();

    const { data: updated, error } = await admin
      .from("vehicles")
      .update({
        year: d.year,
        color: d.color,
        fuel_type: d.fuel_type,
        transmission: d.transmission,
        seats: d.seats,
        doors: d.doors,
        daily_price_cents: d.daily_price_cents,
        description: d.description,
      })
      .eq("id", vehicleId)
      .eq("business_id", business.id)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!updated) return { ok: false, error: "That car was not found." };

    revalidatePath("/s/[slug]", "page");
    revalidatePath("/website");
    return { ok: true };
  } catch (e: any) {
    if (e?.message === "NO_BUSINESS") return { ok: false, error: "Please sign in again." };
    return { ok: false, error: e?.message || "Save failed." };
  }
}
