"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";

export type DocsResult = { ok?: boolean; error?: string };

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
