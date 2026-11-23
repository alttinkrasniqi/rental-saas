"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";
import { numberToCents } from "@/lib/format";

export type GoalResult = { ok?: boolean; error?: string };

// Set (or clear) the recurring monthly revenue target. 0 clears it.
export async function setRevenueGoal(_prev: GoalResult, formData: FormData): Promise<GoalResult> {
  const business = await requireBusiness();
  const supabase = createClient();
  const raw = String(formData.get("target") || "").trim().replace(",", ".");
  const n = raw ? Number(raw) : 0;
  const cents = Number.isNaN(n) || n < 0 ? 0 : numberToCents(n);

  const { error } = await supabase
    .from("businesses")
    .update({ monthly_revenue_target_cents: cents })
    .eq("id", business.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
