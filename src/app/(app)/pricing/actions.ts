"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";
import { numberToCents } from "@/lib/format";

export type PriceRuleState = { error?: string };

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function createPriceRule(
  _prev: PriceRuleState,
  formData: FormData
): Promise<PriceRuleState> {
  const business = await requireBusiness();
  const supabase = createClient();

  const vehicleRaw = String(formData.get("vehicle_id") || "").trim();
  const vehicle_id = vehicleRaw && vehicleRaw !== "__all__" ? vehicleRaw : null;
  const label = String(formData.get("label") || "").trim() || null;
  const start_date = String(formData.get("start_date") || "").trim();
  const endRaw = String(formData.get("end_date") || "").trim();
  const end_date = isDate(endRaw) ? endRaw : null;
  const adjust_type = String(formData.get("adjust_type") || "percent");

  if (!isDate(start_date)) return { error: "Choose a start date." };
  if (adjust_type !== "percent" && adjust_type !== "fixed_daily") return { error: "Invalid rule type." };
  if (end_date && end_date < start_date) return { error: "The end date must be on or after the start date." };

  let adjust_value: number;
  if (adjust_type === "percent") {
    const p = Number(String(formData.get("percent") || "").replace(",", "."));
    if (!Number.isFinite(p) || p === 0) return { error: "Enter a percentage, e.g. 15 or -20." };
    adjust_value = Math.round(p);
  } else {
    const price = Number(String(formData.get("fixed_price") || "").replace(",", "."));
    if (!Number.isFinite(price) || price <= 0) return { error: "Enter a fixed daily price." };
    adjust_value = numberToCents(price);
  }

  if (vehicle_id) {
    const { data: v } = await supabase
      .from("vehicles")
      .select("id")
      .eq("id", vehicle_id)
      .eq("business_id", business.id)
      .maybeSingle();
    if (!v) return { error: "That car was not found." };
  }

  const { error } = await supabase.from("price_rules").insert({
    business_id: business.id,
    vehicle_id,
    label,
    start_date,
    end_date,
    adjust_type,
    adjust_value,
  });
  if (error) return { error: error.message };

  revalidatePath("/pricing");
  revalidatePath("/rentals/new");
  return {};
}

export async function deletePriceRule(formData: FormData) {
  await requireBusiness();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;
  // RLS limits this to the caller's own rules.
  await supabase.from("price_rules").delete().eq("id", id);
  revalidatePath("/pricing");
  revalidatePath("/rentals/new");
}
