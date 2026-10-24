"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";

export type SettingsState = { error?: string; ok?: boolean };

export async function updateBusiness(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const business = await requireBusiness();
  const supabase = createClient();

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Business name is required." };

  const { error } = await supabase
    .from("businesses")
    .update({
      name,
      phone: String(formData.get("phone") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      address: String(formData.get("address") || "").trim() || null,
      currency: String(formData.get("currency") || "EUR").trim() || "EUR",
      timezone: String(formData.get("timezone") || "Europe/Tirane").trim(),
    })
    .eq("id", business.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
