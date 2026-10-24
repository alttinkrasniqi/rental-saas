"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { rentalDays, formatDate } from "@/lib/format";
import { notifyNewBooking } from "@/lib/notify";

export type BookingState = {
  ok?: boolean;
  error?: string;
  waPhone?: string;
  waText?: string;
  carName?: string;
  from?: string;
  to?: string;
};

// Public, anonymous reservation. The tenant is resolved from the submitted
// slug (a hidden field on the form) and every row is validated to belong to
// that one business. Online requests start approved = false (they appear under
// Requests until the owner approves).
export async function createOnlineReservation(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const admin = createAdminClient();

  const slug = String(formData.get("slug") || "").trim();
  const vehicleId = String(formData.get("vehicle_id") || "");
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const fromDate = String(formData.get("pickup_date") || "");
  const toDate = String(formData.get("return_date") || "");

  if (!slug) return { error: "Something went wrong. Please reload the page." };
  if (!vehicleId) return { error: "Please choose a car." };
  if (!name) return { error: "Please enter your name." };
  if (!phone) return { error: "Please enter your phone number." };
  if (!fromDate || !toDate) return { error: "Please choose your dates." };

  const pickup = new Date(`${fromDate}T09:00`);
  const ret = new Date(`${toDate}T18:00`);
  if (Number.isNaN(pickup.getTime()) || Number.isNaN(ret.getTime()))
    return { error: "Those dates look invalid." };
  if (ret <= pickup) return { error: "The return date must be after the pickup date." };

  const { data: biz } = await admin
    .from("businesses")
    .select("id, phone, email")
    .eq("slug", slug)
    .maybeSingle();
  if (!biz?.id) return { error: "Online booking isn't available right now. Please contact us directly." };

  const { data: veh } = await admin
    .from("vehicles")
    .select("id, make, model, plate, daily_price_cents, business_id, archived, status")
    .eq("id", vehicleId)
    .maybeSingle();
  if (
    !veh ||
    veh.archived ||
    veh.business_id !== biz.id ||
    veh.status === "MAINTENANCE" ||
    veh.status === "UNAVAILABLE"
  ) {
    return { error: "Sorry, that car isn't available." };
  }

  const { data: clash } = await admin
    .from("rentals")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .in("status", ["ACTIVE", "RESERVED"])
    .lt("pickup_at", ret.toISOString())
    .gt("return_at", pickup.toISOString());
  if (clash && clash.length > 0) {
    return { error: "Sorry — that car was just booked for those dates. Please pick other dates or another car." };
  }

  const { data: client, error: cErr } = await admin
    .from("clients")
    .insert({ business_id: biz.id, full_name: name, phone, email, notes: "Online booking" })
    .select("id")
    .single();
  if (cErr || !client) return { error: "Couldn't save your details. Please try again." };

  const days = rentalDays(pickup, ret);
  const totalCents = days * (veh.daily_price_cents ?? 0);
  const status = pickup <= new Date() ? "ACTIVE" : "RESERVED";

  const { error: rErr } = await admin.from("rentals").insert({
    business_id: biz.id,
    vehicle_id: vehicleId,
    client_id: client.id,
    status,
    source: "online",
    approved: false, // waits for the owner's approval under Requests
    open_ended: false,
    pickup_at: pickup.toISOString(),
    return_at: ret.toISOString(),
    daily_rate_cents: veh.daily_price_cents ?? 0,
    total_cents: totalCents,
    deposit_cents: 0,
    paid_cents: 0,
    payment_method: null,
    notes: "Online reservation",
  });
  if (rErr) return { error: "Couldn't create the reservation. Please try again." };

  await admin
    .from("vehicles")
    .update({ status: status === "ACTIVE" ? "RENTED" : "RESERVED" })
    .eq("id", vehicleId);

  const carName = `${veh.make} ${veh.model}`;

  // Email the owner (their own business email, falling back to NOTIFY_EMAIL).
  await notifyNewBooking({
    to: biz.email || undefined,
    carName,
    plate: veh.plate || "",
    from: pickup.toISOString(),
    to_date: ret.toISOString(),
    customer: name,
    phone,
  });

  revalidatePath("/dashboard");
  revalidatePath("/rentals");
  revalidatePath("/calendar");
  revalidatePath("/requests");
  revalidatePath(`/s/${slug}`);

  const fromLabel = formatDate(pickup);
  const toLabel = formatDate(ret);
  const waPhone = String(biz.phone || "").replace(/[^0-9]/g, "");
  const waText = `Përshëndetje, e rezervova ${carName} për datat ${fromLabel} - ${toLabel}`;

  return { ok: true, waPhone, waText, carName, from: fromLabel, to: toLabel };
}
