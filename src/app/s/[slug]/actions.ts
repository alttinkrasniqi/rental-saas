"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { rentalDays, formatDate } from "@/lib/format";
import { notifyNewBooking } from "@/lib/notify";
import { rateLimit, clientIp } from "@/lib/ratelimit";

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
  // Throttle anonymous booking spam per IP.
  const rl = await rateLimit(`booking:ip:${clientIp()}`, 10, 3600);
  if (!rl.allowed) return { error: "Too many booking attempts. Please try again later." };

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
    businessId: biz.id,
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

export type LeadState = { ok?: boolean; error?: string };

// Public "request a car" lead when the customer can't find an available car.
export async function createLead(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const rl = await rateLimit(`lead:ip:${clientIp()}`, 15, 3600);
  if (!rl.allowed) return { error: "Too many requests. Please try again later." };

  const admin = createAdminClient();
  const slug = String(formData.get("slug") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const pickup = String(formData.get("pickup_date") || "").trim() || null;
  const ret = String(formData.get("return_date") || "").trim() || null;
  const carType = String(formData.get("car_type") || "").trim() || null;
  const note = String(formData.get("note") || "").trim() || null;

  if (!slug) return { error: "Something went wrong. Please reload the page." };
  if (!name) return { error: "Please enter your name." };
  if (!phone) return { error: "Please enter your phone number." };

  const { data: biz } = await admin.from("businesses").select("id").eq("slug", slug).maybeSingle();
  if (!biz?.id) return { error: "Not available right now. Please contact us directly." };

  const { error } = await admin.from("leads").insert({
    business_id: biz.id,
    name,
    phone,
    email,
    pickup_date: pickup,
    return_date: ret,
    car_type: carType,
    note,
    status: "new",
    source: "public",
  });
  if (error) return { error: "Couldn't send your request. Please try again." };

  revalidatePath("/waitlist");
  revalidatePath("/dashboard");
  return { ok: true };
}

export type ReviewState = { ok?: boolean; error?: string; googleUrl?: string | null };

// Public review submission. Happy ratings (>=4) are offered the Google link;
// low ratings become private feedback the owner reads in the app.
export async function submitReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const rl = await rateLimit(`review:ip:${clientIp()}`, 20, 3600);
  if (!rl.allowed) return { error: "Too many submissions. Please try again later." };

  const admin = createAdminClient();
  const slug = String(formData.get("slug") || "").trim();
  const rating = Math.max(0, Math.min(5, parseInt(String(formData.get("rating") || "0"), 10) || 0));
  const comment = String(formData.get("comment") || "").trim() || null;
  const name = String(formData.get("name") || "").trim() || null;

  if (!slug) return { error: "Something went wrong. Please reload the page." };
  if (rating < 1) return { error: "Please choose a rating." };

  const { data: biz } = await admin
    .from("businesses")
    .select("id, google_review_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!biz?.id) return { error: "Not available right now." };

  await admin.from("reviews").insert({ business_id: biz.id, rating, comment, name });

  revalidatePath("/reviews");
  revalidatePath("/dashboard");
  return { ok: true, googleUrl: rating >= 4 ? (biz.google_review_url || null) : null };
}
