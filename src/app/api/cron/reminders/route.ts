import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyRentalReminder } from "@/lib/notify";

// Daily reminder job (feature 2.4). Vercel Cron hits this once a day (see
// vercel.json). It emails each client:
//   • a PICKUP reminder the day before pickup,
//   • a RETURN reminder on the day the car is due back,
//   • an OVERDUE notice when the return date has passed and the car is still out.
// Each rental carries three timestamp columns (see supabase/rental_reminders.sql)
// so a reminder is never sent twice. Runs with the service-role client (bypasses
// RLS) so it can see every tenant's rentals — it only READS rentals and stamps
// the reminded_at columns, nothing destructive.
//
// Protected by CRON_SECRET: set it in Vercel and the cron caller sends it as a
// Bearer token. Without the env set the route refuses to run.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// yyyy-mm-dd for a date, in the business's local timezone (Kosovo/Albania).
function localDay(d: Date): string {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Tirane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return f.format(d); // en-CA gives yyyy-mm-dd
}

export async function GET(req: Request) {
  // --- auth ---
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not set" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const now = new Date();
  const today = localDay(now);
  const tomorrow = localDay(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  // Pull every rental that is still open (RESERVED or ACTIVE). The set is small
  // per tenant; we decide pickup/return/overdue per row below.
  const { data, error } = await supabase
    .from("rentals")
    .select(
      "id, pickup_at, return_at, open_ended, status, source, approved, " +
        "pickup_reminded_at, return_reminded_at, overdue_reminded_at, " +
        "vehicle:vehicles(make, model, plate), " +
        "client:clients(email), " +
        "business:businesses(name, phone, email)"
    )
    .in("status", ["RESERVED", "ACTIVE"]);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data as any[]) || [];
  const sent = { pickup: 0, return: 0, overdue: 0 };
  const stamp = {
    pickup: [] as string[],
    return: [] as string[],
    overdue: [] as string[],
  };

  for (const r of rows) {
    // Skip online requests the owner hasn't approved yet.
    if (r.source === "online" && r.approved !== true) continue;

    const email: string | undefined = r.client?.email || undefined;
    const v = r.vehicle;
    const biz = r.business;
    const carName = v ? `${v.make} ${v.model}` : undefined;

    const pickupDay = r.pickup_at ? localDay(new Date(r.pickup_at)) : null;
    const returnDay = r.return_at ? localDay(new Date(r.return_at)) : null;

    const base = {
      to: email,
      replyTo: biz?.email || undefined,
      businessName: biz?.name || undefined,
      businessPhone: biz?.phone || undefined,
      carName,
      plate: v?.plate ?? null,
      from: r.pickup_at,
      to_date: r.return_at,
    };

    // 1) Pickup reminder — the day before pickup.
    if (email && pickupDay === tomorrow && !r.pickup_reminded_at) {
      await notifyRentalReminder({ ...base, type: "pickup" });
      sent.pickup++;
      stamp.pickup.push(r.id);
    }

    // 2) Return reminder — on the due day (not open-ended).
    if (email && !r.open_ended && returnDay === today && !r.return_reminded_at) {
      await notifyRentalReminder({ ...base, type: "return" });
      sent.return++;
      stamp.return.push(r.id);
    }

    // 3) Overdue notice — return date has already passed, car still out.
    if (
      email &&
      !r.open_ended &&
      returnDay &&
      returnDay < today &&
      !r.overdue_reminded_at
    ) {
      await notifyRentalReminder({ ...base, type: "overdue" });
      sent.overdue++;
      stamp.overdue.push(r.id);
    }
  }

  // Stamp the reminded_at columns so none of these repeats tomorrow.
  const nowIso = now.toISOString();
  if (stamp.pickup.length) {
    await supabase.from("rentals").update({ pickup_reminded_at: nowIso }).in("id", stamp.pickup);
  }
  if (stamp.return.length) {
    await supabase.from("rentals").update({ return_reminded_at: nowIso }).in("id", stamp.return);
  }
  if (stamp.overdue.length) {
    await supabase.from("rentals").update({ overdue_reminded_at: nowIso }).in("id", stamp.overdue);
  }

  return NextResponse.json({ ok: true, scanned: rows.length, sent });
}
