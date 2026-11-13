"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";

export type BlockState = { error?: string };

// Create a maintenance block for a car over an inclusive date range. Rejects if
// the car already has an open booking in that window — you don't take a rented
// car in for service without dealing with the booking first.
export async function createMaintenanceBlock(formData: FormData): Promise<BlockState> {
  const business = await requireBusiness();
  const supabase = createClient();

  const vehicleId = String(formData.get("vehicle_id") || "");
  const start = String(formData.get("start_date") || "").trim();
  const end = (String(formData.get("end_date") || "").trim() || start);
  const reason = String(formData.get("reason") || "").trim() || null;

  if (!vehicleId || !start) return { error: "Please choose the days to block." };
  if (end < start) return { error: "The end date must be on or after the start date." };

  // Ownership: the car must belong to the caller's business.
  const { data: v } = await supabase
    .from("vehicles")
    .select("id")
    .eq("id", vehicleId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!v) return { error: "That car was not found." };

  // Don't block a car that is booked during the window.
  const { data: ov } = await supabase
    .from("rentals")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .in("status", ["ACTIVE", "RESERVED"])
    .lt("pickup_at", `${end}T23:59:59`)
    .gt("return_at", `${start}T00:00:00`);
  if (ov && ov.length > 0) return { error: "This car has a booking in those days. Free it first, or pick other days." };

  const { error } = await supabase.from("maintenance_blocks").insert({
    business_id: business.id,
    vehicle_id: vehicleId,
    start_date: start,
    end_date: end,
    reason,
  });
  if (error) return { error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/cars");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteMaintenanceBlock(formData: FormData): Promise<BlockState> {
  await requireBusiness();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return { error: "Missing block." };

  // RLS limits this to the caller's own blocks.
  const { error } = await supabase.from("maintenance_blocks").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/cars");
  revalidatePath("/dashboard");
  return {};
}
