"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";
import { numberToCents } from "@/lib/format";

function moneyToCents(v: FormDataEntryValue | null): number {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return 0;
  const n = Number(s);
  return Number.isNaN(n) ? 0 : numberToCents(n);
}

const STATUSES = ["new", "billed", "paid", "waived"] as const;

// Find the rental (and its client) that had this car out on the violation date.
// Returns the best match — the covering rental with the latest pickup — or null.
async function matchRental(vehicleId: string, fineDate: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("rentals")
    .select("id, client_id, pickup_at, return_at, returned_at, open_ended, status")
    .eq("vehicle_id", vehicleId)
    .neq("status", "CANCELLED");
  const rows = (data ?? []) as any[];
  let best: any = null;
  for (const r of rows) {
    const start = String(r.pickup_at ?? "").slice(0, 10);
    if (!start || fineDate < start) continue;
    // End of the window: the real return (returned_at), else the planned return;
    // an open-ended rental not yet returned covers everything from pickup on.
    let end: string | null;
    if (r.returned_at) end = String(r.returned_at).slice(0, 10);
    else if (r.open_ended) end = null; // still out → no upper bound
    else end = String(r.return_at ?? "").slice(0, 10) || null;
    if (end && fineDate > end) continue;
    if (!best || start > String(best.pickup_at ?? "").slice(0, 10)) best = r;
  }
  return best;
}

export async function addFine(formData: FormData) {
  const business = await requireBusiness();
  const supabase = createClient();

  const vehicleId = String(formData.get("vehicle_id") || "") || null;
  const fineDate = String(formData.get("fine_date") || "").trim();
  const amount = moneyToCents(formData.get("amount"));
  const reference = String(formData.get("reference") || "").trim() || null;
  const location = String(formData.get("location") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  if (!fineDate) return;

  let rentalId: string | null = null;
  let clientId: string | null = null;
  if (vehicleId) {
    const match = await matchRental(vehicleId, fineDate);
    if (match) { rentalId = match.id; clientId = match.client_id ?? null; }
  }

  await supabase.from("traffic_fines").insert({
    business_id: business.id,
    vehicle_id: vehicleId,
    rental_id: rentalId,
    client_id: clientId,
    fine_date: fineDate,
    amount_cents: amount,
    reference,
    location,
    notes,
    status: "new",
  });

  revalidatePath("/fines");
  revalidatePath("/dashboard");
  redirect("/fines?toast=created");
}

export async function setFineStatus(formData: FormData) {
  const business = await requireBusiness();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id || !STATUSES.includes(status as any)) return;
  await supabase.from("traffic_fines").update({ status }).eq("id", id).eq("business_id", business.id);
  revalidatePath("/fines");
}

export async function deleteFine(formData: FormData) {
  const business = await requireBusiness();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await supabase.from("traffic_fines").delete().eq("id", id).eq("business_id", business.id);
  revalidatePath("/fines");
}
