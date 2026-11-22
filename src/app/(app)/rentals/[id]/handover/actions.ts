"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";

export type DocsResult = { ok?: boolean; error?: string };

// Finish the guided handover: mark the car as handed to the client. If the
// booking was still a future reservation, it becomes active now, and the car
// shows as rented. Redirects back to the rental with a success toast.
export async function completeHandover(formData: FormData) {
  const business = await requireBusiness();
  const supabase = createClient();
  const rentalId = String(formData.get("rental_id") || "");
  if (!rentalId) return;

  const { data: rental } = await supabase
    .from("rentals")
    .select("vehicle_id, status")
    .eq("id", rentalId)
    .eq("business_id", business.id)
    .single();
  if (!rental) return;

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = { handed_over_at: nowIso, updated_at: nowIso };
  if (rental.status === "RESERVED") patch.status = "ACTIVE";
  await supabase.from("rentals").update(patch).eq("id", rentalId);

  if (rental.vehicle_id) {
    await supabase.from("vehicles").update({ status: "RENTED", updated_at: nowIso }).eq("id", rental.vehicle_id);
  }

  revalidatePath(`/rentals/${rentalId}`);
  revalidatePath("/rentals");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  redirect(`/rentals/${rentalId}?toast=handover`);
}

// Save the renter's identity documents captured during the guided handover.
// Scoped to the owner's business (RLS enforces it too). Does not redirect — the
// wizard stays on the page.
export async function updateClientDocs(_prev: DocsResult, formData: FormData): Promise<DocsResult> {
  const business = await requireBusiness();
  const supabase = createClient();
  const clientId = String(formData.get("client_id") || "");
  if (!clientId) return { error: "Missing client." };

  const idNumber = String(formData.get("id_number") || "").trim() || null;
  const licenseNumber = String(formData.get("license_number") || "").trim() || null;

  const { error } = await supabase
    .from("clients")
    .update({ id_number: idNumber, license_number: licenseNumber, updated_at: new Date().toISOString() })
    .eq("id", clientId)
    .eq("business_id", business.id);
  if (error) return { error: error.message };

  revalidatePath(`/rentals`);
  return { ok: true };
}
