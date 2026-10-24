"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";
import { numberToCents } from "@/lib/format";
import type { VehicleStatus } from "@/lib/types";

export type VehicleFormState = { error?: string };

function intOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

function moneyToCents(v: FormDataEntryValue | null): number {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return 0;
  const n = Number(s);
  return Number.isNaN(n) ? 0 : numberToCents(n);
}

function parseVehicle(formData: FormData) {
  return {
    make: String(formData.get("make") || "").trim(),
    model: String(formData.get("model") || "").trim(),
    year: intOrNull(formData.get("year")),
    plate: String(formData.get("plate") || "").trim().toUpperCase(),
    color: String(formData.get("color") || "").trim() || null,
    fuel_type: String(formData.get("fuel_type") || "").trim() || null,
    transmission: String(formData.get("transmission") || "").trim() || null,
    mileage: intOrNull(formData.get("mileage")),
    seats: intOrNull(formData.get("seats")),
    doors: intOrNull(formData.get("doors")),
    daily_price_cents: moneyToCents(formData.get("daily_price")),
    status: (String(formData.get("status") || "AVAILABLE") as VehicleStatus),
    notes: String(formData.get("notes") || "").trim() || null,
  };
}

export async function createVehicle(
  _prev: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  const business = await requireBusiness();
  const data = parseVehicle(formData);

  if (!data.make || !data.model) return { error: "Make and model are required." };
  if (!data.plate) return { error: "Registration plate is required." };

  const supabase = createClient();
  const { error } = await supabase.from("vehicles").insert({
    business_id: business.id,
    ...data,
  });
  if (error) return { error: error.message };

  revalidatePath("/cars");
  redirect("/cars");
}

export async function updateVehicle(
  _prev: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  await requireBusiness();
  const id = String(formData.get("id") || "");
  if (!id) return { error: "Missing vehicle id." };

  const data = parseVehicle(formData);
  if (!data.make || !data.model) return { error: "Make and model are required." };
  if (!data.plate) return { error: "Registration plate is required." };

  const supabase = createClient();
  const { error } = await supabase
    .from("vehicles")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/cars");
  revalidatePath(`/cars/${id}`);
  redirect(`/cars/${id}`);
}

export async function setVehicleStatus(id: string, status: VehicleStatus) {
  await requireBusiness();
  const supabase = createClient();
  await supabase
    .from("vehicles")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/cars");
  revalidatePath(`/cars/${id}`);
}

export async function archiveVehicle(formData: FormData) {
  await requireBusiness();
  const id = String(formData.get("id") || "");
  if (!id) return;
  const supabase = createClient();
  await supabase
    .from("vehicles")
    .update({ archived: true, status: "UNAVAILABLE", updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/cars");
  redirect("/cars");
}
