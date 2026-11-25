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

// Common rent-a-car extras for the Kosovo/Balkan market. One-click seed; the
// owner edits prices or removes any afterwards. Prices are sensible defaults.
const COMMON_EXTRAS: { name: string; kind: "flat" | "per_day"; unit_cents: number }[] = [
  { name: "Shofer shtesë", kind: "per_day", unit_cents: 700 },
  { name: "Dorëzim / marrje në qytet", kind: "flat", unit_cents: 1000 },
  { name: "Dorëzim në aeroport", kind: "flat", unit_cents: 2500 },
  { name: "Karrige për fëmijë", kind: "per_day", unit_cents: 300 },
  { name: "GPS / navigim", kind: "per_day", unit_cents: 300 },
  { name: "Pastrim", kind: "flat", unit_cents: 1500 },
  { name: "Sigurim i plotë (CDW)", kind: "per_day", unit_cents: 1000 },
  { name: "Autorizim për kalim kufiri", kind: "flat", unit_cents: 2000 },
  { name: "Goma dimri / zinxhirë", kind: "per_day", unit_cents: 400 },
];

export async function addCommonExtras() {
  const business = await requireBusiness();
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("rental_extras")
    .select("name")
    .eq("business_id", business.id);
  const have = new Set((existing ?? []).map((e: any) => String(e.name).trim().toLowerCase()));
  const rows = COMMON_EXTRAS.filter((e) => !have.has(e.name.toLowerCase())).map((e, i) => ({
    business_id: business.id,
    name: e.name,
    kind: e.kind,
    unit_cents: e.unit_cents,
    sort: i,
  }));
  if (rows.length) await supabase.from("rental_extras").insert(rows);
  revalidatePath("/settings");
  revalidatePath("/rentals/new");
}
