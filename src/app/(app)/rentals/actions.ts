"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";
import { numberToCents, rentalDays } from "@/lib/format";
import type { RentalStatus } from "@/lib/types";

export type RentalFormState = { error?: string };

function moneyToCents(v: FormDataEntryValue | null): number {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return 0;
  const n = Number(s);
  return Number.isNaN(n) ? 0 : numberToCents(n);
}

function intOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

function combine(dateStr: string, timeStr: string, fallbackTime: string): Date | null {
  if (!dateStr) return null;
  const t = timeStr || fallbackTime;
  const d = new Date(`${dateStr}T${t}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function findOverlaps(
  vehicleId: string,
  pickupISO: string,
  returnISO: string,
  excludeId?: string
) {
  const supabase = createClient();
  let q = supabase
    .from("rentals")
    .select("id, pickup_at, return_at, client:clients(full_name)")
    .eq("vehicle_id", vehicleId)
    // Only OPEN rentals block a car. A returned (COMPLETED) or cancelled
    // rental must never cause an "already booked" error — same rule the
    // rest of the app uses (see src/lib/availability.ts).
    .in("status", ["ACTIVE", "RESERVED"])
    .lt("pickup_at", returnISO)
    .gt("return_at", pickupISO);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return (data ?? []) as any[];
}

export async function createRental(
  _prev: RentalFormState,
  formData: FormData
): Promise<RentalFormState> {
  const business = await requireBusiness();
  const supabase = createClient();

  const clientId = String(formData.get("client_id") || "");
  const vehicleId = String(formData.get("vehicle_id") || "");
  if (!clientId) return { error: "Please choose a client." };
  if (!vehicleId) return { error: "Please choose a car." };

  // Support creating a brand-new client inline from the rental form.
  let resolvedClientId = clientId;
  if (clientId === "__new__") {
    const name = String(formData.get("new_client_name") || "").trim();
    const phone = String(formData.get("new_client_phone") || "").trim() || null;
    if (!name) return { error: "Enter the new client's name." };
    const { data: newClient, error: clientErr } = await supabase
      .from("clients")
      .insert({ business_id: business.id, full_name: name, phone })
      .select("id")
      .single();
    if (clientErr || !newClient) return { error: "Could not create the new client." };
    resolvedClientId = newClient.id;
  }

  // Open-ended ("flexible") rental: no fixed return date.
  const openEnded = !!formData.get("open_ended");

  const pickup = combine(
    String(formData.get("pickup_date") || ""),
    String(formData.get("pickup_time") || ""),
    "09:00"
  );
  if (!pickup) return { error: "Please choose a pickup date." };

  let ret: Date | null;
  if (openEnded) {
    // Placeholder return equal to pickup; the real end is set when returned.
    ret = pickup;
  } else {
    ret = combine(
      String(formData.get("return_date") || ""),
      String(formData.get("return_time") || ""),
      "18:00"
    );
    if (!ret) return { error: "Please choose a return date (or turn on the flexible option)." };
    if (ret <= pickup) return { error: "The return date must be after the pickup date." };

    const overlaps = await findOverlaps(vehicleId, pickup.toISOString(), ret.toISOString());
    if (overlaps.length > 0) {
      const o = overlaps[0];
      const who = o.client?.full_name ? ` (${o.client.full_name})` : "";
      return {
        error: `This car is already booked for those dates${who}. Pick different dates or another car.`,
      };
    }
  }

  const days = rentalDays(pickup, ret);
  const dailyRateCents = moneyToCents(formData.get("daily_rate"));
  const totalOverride = String(formData.get("total") || "").trim();
  // Open-ended rentals have no fixed total yet — it adds up day by day.
  const totalCents = openEnded
    ? 0
    : totalOverride
    ? moneyToCents(formData.get("total"))
    : days * dailyRateCents;
  const depositCents = moneyToCents(formData.get("deposit"));
  const paidCents = moneyToCents(formData.get("paid"));
  const method = String(formData.get("payment_method") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  const now = new Date();
  const status: RentalStatus = pickup <= now ? "ACTIVE" : "RESERVED";

  const { data: inserted, error } = await supabase
    .from("rentals")
    .insert({
      business_id: business.id,
      vehicle_id: vehicleId,
      client_id: resolvedClientId,
      status,
      open_ended: openEnded,
      pickup_at: pickup.toISOString(),
      return_at: ret.toISOString(),
      daily_rate_cents: dailyRateCents,
      total_cents: totalCents,
      deposit_cents: depositCents,
      paid_cents: paidCents,
      payment_method: method,
      notes,
    })
    .select("id")
    .single();

  if (error || !inserted) return { error: error?.message ?? "Could not create the rental." };

  if (paidCents > 0) {
    await supabase.from("payments").insert({
      business_id: business.id,
      rental_id: inserted.id,
      amount_cents: paidCents,
      method,
    });
  }

  await supabase
    .from("vehicles")
    .update({ status: status === "ACTIVE" ? "RENTED" : "RESERVED", updated_at: now.toISOString() })
    .eq("id", vehicleId);

  revalidatePath("/rentals");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  redirect(`/rentals/${inserted.id}`);
}

export async function recordPayment(formData: FormData) {
  const business = await requireBusiness();
  const supabase = createClient();
  const rentalId = String(formData.get("rental_id") || "");
  const amount = moneyToCents(formData.get("amount"));
  const method = String(formData.get("method") || "").trim() || null;
  if (!rentalId || amount <= 0) return;

  const { data: rental } = await supabase
    .from("rentals")
    .select("paid_cents")
    .eq("id", rentalId)
    .single();
  if (!rental) return;

  await supabase.from("payments").insert({
    business_id: business.id,
    rental_id: rentalId,
    amount_cents: amount,
    method,
  });
  await supabase
    .from("rentals")
    .update({ paid_cents: (rental.paid_cents ?? 0) + amount, updated_at: new Date().toISOString() })
    .eq("id", rentalId);

  revalidatePath(`/rentals/${rentalId}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function markReturned(formData: FormData) {
  await requireBusiness();
  const supabase = createClient();
  const rentalId = String(formData.get("rental_id") || "");
  const vehicleId = String(formData.get("vehicle_id") || "");
  const mileage = intOrNull(formData.get("return_mileage"));
  if (!rentalId) return;

  const nowIso = new Date().toISOString();

  // For an open-ended rental, lock in the real return date and final total now.
  const { data: rental } = await supabase
    .from("rentals")
    .select("open_ended, pickup_at, daily_rate_cents")
    .eq("id", rentalId)
    .single();

  const patch: Record<string, unknown> = {
    status: "COMPLETED",
    returned_at: nowIso,
    return_mileage: mileage,
    updated_at: nowIso,
  };
  if (rental?.open_ended) {
    const days = rentalDays(rental.pickup_at, new Date());
    patch.return_at = nowIso;
    patch.total_cents = days * (rental.daily_rate_cents ?? 0);
  }

  await supabase.from("rentals").update(patch).eq("id", rentalId);

  if (vehicleId) {
    const vPatch: Record<string, unknown> = { status: "AVAILABLE", updated_at: nowIso };
    if (mileage != null) vPatch.mileage = mileage;
    await supabase.from("vehicles").update(vPatch).eq("id", vehicleId);
  }

  revalidatePath(`/rentals/${rentalId}`);
  revalidatePath("/rentals");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/cars");
}

export async function extendRental(
  _prev: RentalFormState,
  formData: FormData
): Promise<RentalFormState> {
  await requireBusiness();
  const supabase = createClient();
  const rentalId = String(formData.get("rental_id") || "");
  const vehicleId = String(formData.get("vehicle_id") || "");
  if (!rentalId) return { error: "Missing rental." };

  const ret = combine(
    String(formData.get("return_date") || ""),
    String(formData.get("return_time") || ""),
    "18:00"
  );
  if (!ret) return { error: "Please choose a new return date." };

  const { data: rental } = await supabase
    .from("rentals")
    .select("pickup_at, daily_rate_cents")
    .eq("id", rentalId)
    .single();
  if (!rental) return { error: "Rental not found." };

  const pickup = new Date(rental.pickup_at);
  if (ret <= pickup) return { error: "The return date must be after the pickup date." };

  const overlaps = await findOverlaps(vehicleId, rental.pickup_at, ret.toISOString(), rentalId);
  if (overlaps.length > 0) {
    return { error: "The car is booked again before that date. Choose an earlier return." };
  }

  const days = rentalDays(pickup, ret);
  const totalCents = days * (rental.daily_rate_cents ?? 0);

  await supabase
    .from("rentals")
    .update({ return_at: ret.toISOString(), total_cents: totalCents, open_ended: false, updated_at: new Date().toISOString() })
    .eq("id", rentalId);

  revalidatePath(`/rentals/${rentalId}`);
  revalidatePath("/calendar");
  redirect(`/rentals/${rentalId}`);
}

export async function cancelRental(formData: FormData) {
  await requireBusiness();
  const supabase = createClient();
  const rentalId = String(formData.get("id") || "");
  if (!rentalId) return;

  const { data: rental } = await supabase
    .from("rentals")
    .select("vehicle_id")
    .eq("id", rentalId)
    .single();

  await supabase
    .from("rentals")
    .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
    .eq("id", rentalId);

  if (rental?.vehicle_id) {
    await supabase
      .from("vehicles")
      .update({ status: "AVAILABLE", updated_at: new Date().toISOString() })
      .eq("id", rental.vehicle_id);
  }

  revalidatePath(`/rentals/${rentalId}`);
  revalidatePath("/rentals");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/cars");
  redirect(`/rentals/${rentalId}`);
}
