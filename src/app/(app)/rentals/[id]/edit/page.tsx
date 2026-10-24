import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { numberToCents, rentalDays } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EditRentalForm, type EditState } from "../edit-rental-form";

function moneyToCents(v: FormDataEntryValue | null): number {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return 0;
  const n = Number(s);
  return Number.isNaN(n) ? 0 : numberToCents(n);
}

function combine(dateStr: string, timeStr: string, fallbackTime: string): Date | null {
  if (!dateStr) return null;
  const t = timeStr || fallbackTime;
  const d = new Date(`${dateStr}T${t}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function updateRentalAction(_prev: EditState, formData: FormData): Promise<EditState> {
  "use server";
  const supabase = createClient();

  const id = String(formData.get("id") || "");
  const clientId = String(formData.get("client_id") || "");
  const vehicleId = String(formData.get("vehicle_id") || "");
  if (!id) return { error: "Missing rental." };
  if (!clientId) return { error: "Please choose a client." };
  if (!vehicleId) return { error: "Please choose a car." };

  const openEnded = !!formData.get("open_ended");

  const pickup = combine(
    String(formData.get("pickup_date") || ""),
    String(formData.get("pickup_time") || ""),
    "09:00"
  );
  if (!pickup) return { error: "Please choose a pickup date." };

  let ret: Date;
  if (openEnded) {
    ret = pickup;
  } else {
    const parsed = combine(
      String(formData.get("return_date") || ""),
      String(formData.get("return_time") || ""),
      "18:00"
    );
    if (!parsed) return { error: "Please choose a return date (or turn on the flexible option)." };
    if (parsed <= pickup) return { error: "The return date must be after the pickup date." };
    ret = parsed;

    // Double-booking check, excluding this rental itself.
    const { data: clash } = await supabase
      .from("rentals")
      .select("id, client:clients(full_name)")
      .eq("vehicle_id", vehicleId)
      .neq("status", "CANCELLED")
      .neq("id", id)
      .lt("pickup_at", ret.toISOString())
      .gt("return_at", pickup.toISOString());
    if (clash && clash.length > 0) {
      const who = (clash[0] as any).client?.full_name ? ` (${(clash[0] as any).client.full_name})` : "";
      return { error: `That car is already booked for those dates${who}. Pick different dates or another car.` };
    }
  }

  const days = rentalDays(pickup, ret);
  const dailyRateCents = moneyToCents(formData.get("daily_rate"));
  const totalField = String(formData.get("total") || "").trim();
  const totalCents = openEnded ? 0 : totalField ? moneyToCents(formData.get("total")) : days * dailyRateCents;
  const depositCents = moneyToCents(formData.get("deposit"));
  const method = String(formData.get("payment_method") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  // Current state (to sync vehicle status if the car changed).
  const { data: cur } = await supabase.from("rentals").select("vehicle_id, status").eq("id", id).single();

  const { error } = await supabase
    .from("rentals")
    .update({
      client_id: clientId,
      vehicle_id: vehicleId,
      open_ended: openEnded,
      pickup_at: pickup.toISOString(),
      return_at: ret.toISOString(),
      daily_rate_cents: dailyRateCents,
      total_cents: totalCents,
      deposit_cents: depositCents,
      payment_method: method,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  // Keep vehicle statuses sensible when the booking is live and the car changed.
  if (cur && (cur.status === "ACTIVE" || cur.status === "RESERVED")) {
    const now = new Date().toISOString();
    if (cur.vehicle_id && cur.vehicle_id !== vehicleId) {
      await supabase.from("vehicles").update({ status: "AVAILABLE", updated_at: now }).eq("id", cur.vehicle_id);
    }
    await supabase
      .from("vehicles")
      .update({ status: cur.status === "ACTIVE" ? "RENTED" : "RESERVED", updated_at: now })
      .eq("id", vehicleId);
  }

  revalidatePath(`/rentals/${id}`);
  revalidatePath("/rentals");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  redirect(`/rentals/${id}`);
}

export default async function EditRentalPage({ params }: { params: { id: string } }) {
  const business = await getBusiness();
  const supabase = createClient();

  const { data: rData } = await supabase.from("rentals").select("*").eq("id", params.id).maybeSingle();
  if (!rData) notFound();

  const [{ data: cars }, { data: clients }] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, make, model, plate, daily_price_cents")
      .eq("archived", false)
      .order("make", { ascending: true }),
    supabase.from("clients").select("id, full_name").eq("deleted", false).order("full_name", { ascending: true }),
  ]);

  return (
    <div>
      <PageHeader title="Edit rental" subtitle="Change the booking details" />
      <EditRentalForm
        action={updateRentalAction}
        rental={rData}
        cars={cars ?? []}
        clients={clients ?? []}
        currency={business?.currency ?? "EUR"}
      />
    </div>
  );
}
