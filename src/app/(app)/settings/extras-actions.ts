"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";
import { numberToCents } from "@/lib/format";

function toCents(v: FormDataEntryValue | null): number {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return 0;
  const n = Number(s);
  return Number.isNaN(n) ? 0 : numberToCents(n);
}

export async function addExtra(formData: FormData) {
  const business = await requireBusiness();
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  const kind = String(formData.get("kind") || "flat") === "per_day" ? "per_day" : "flat";
  const unit = toCents(formData.get("price"));
  if (name && unit > 0) {
    await supabase.from("rental_extras").insert({ business_id: business.id, name, kind, unit_cents: unit });
  }
  revalidatePath("/settings");
  revalidatePath("/rentals/new");
}

export async function updateExtra(formData: FormData) {
  const business = await requireBusiness();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const kind = String(formData.get("kind") || "flat") === "per_day" ? "per_day" : "flat";
  const unit = toCents(formData.get("price"));
  if (id && name && unit > 0) {
    await supabase.from("rental_extras").update({ name, kind, unit_cents: unit }).eq("id", id).eq("business_id", business.id);
  }
  revalidatePath("/settings");
  revalidatePath("/rentals/new");
}

export async function deleteExtra(formData: FormData) {
  const business = await requireBusiness();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (id) {
    await supabase.from("rental_extras").delete().eq("id", id).eq("business_id", business.id);
  }
  revalidatePath("/settings");
  revalidatePath("/rentals/new");
}
