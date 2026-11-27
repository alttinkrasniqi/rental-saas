"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";

const clampInt = (v: FormDataEntryValue | null, min: number, max: number, def: number) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def;
};

export async function saveLoyaltySettings(formData: FormData) {
  const business = await requireBusiness();
  const supabase = createClient();
  const loyalty_min_rentals = clampInt(formData.get("min_rentals"), 1, 50, 3);
  const winback_days = clampInt(formData.get("winback_days"), 7, 365, 60);
  const loyalty_discount_pct = clampInt(formData.get("discount_pct"), 0, 90, 10);
  await supabase.from("businesses").update({ loyalty_min_rentals, winback_days, loyalty_discount_pct }).eq("id", business.id);
  revalidatePath("/loyalty");
}
