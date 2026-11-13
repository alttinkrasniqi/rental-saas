import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { RentalForm } from "../rental-form";
import { getT } from "@/lib/i18n/server";

export default async function NewRentalPage({
  searchParams,
}: {
  searchParams: { client?: string; vehicle?: string; date?: string; return?: string };
}) {
  const t = getT();
  const business = await getBusiness();
  const supabase = createClient();

  const [{ data: cars }, { data: clients }, { data: bookings }, { data: rules }] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, make, model, plate, daily_price_cents, weekly_price_cents, monthly_price_cents")
      .eq("archived", false)
      .order("make", { ascending: true }),
    supabase.from("clients").select("id, full_name").eq("deleted", false).order("full_name", { ascending: true }),
    // Only OPEN rentals block a car's dates. Returned/completed and cancelled
    // rentals must NOT make a car look "Booked" — keeps this in sync with the
    // Cars page status.
    supabase
      .from("rentals")
      .select("vehicle_id, pickup_at, return_at, client:clients(full_name)")
      .in("status", ["ACTIVE", "RESERVED"]),
    supabase.from("price_rules").select("id, vehicle_id, label, start_date, end_date, adjust_type, adjust_value"),
  ]);

  const bookingsMapped = (bookings ?? []).map((b: any) => ({
    vehicle_id: b.vehicle_id,
    pickup_at: b.pickup_at,
    return_at: b.return_at,
    client_name: b.client?.full_name ?? null,
  }));

  return (
    <div>
      <PageHeader title={t("New rental")} subtitle={t("Pick the dates, then choose a free car")} />
      <RentalForm
        cars={cars ?? []}
        rules={rules ?? []}
        clients={clients ?? []}
        bookings={bookingsMapped}
        currency={business?.currency ?? "EUR"}
        preselectClientId={searchParams.client}
        preselectVehicleId={searchParams.vehicle}
        presetPickupDate={searchParams.date}
        presetReturnDate={searchParams.return}
      />
    </div>
  );
}
