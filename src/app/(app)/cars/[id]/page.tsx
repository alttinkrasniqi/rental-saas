import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VehicleStatusBadge, RentalStatusBadge, PaymentStatusBadge } from "@/components/status-badges";
import { ConfirmButton } from "@/components/confirm-button";
import { CarStatusActions } from "./car-status-actions";
import { archiveVehicle } from "../actions";
import { formatMoney, formatDate, rentalDays } from "@/lib/format";
import { carsOutNow, carsReservedSoon, liveVehicleStatus } from "@/lib/availability";
import type { Vehicle } from "@/lib/types";

// Permanently delete a car. Because rentals reference the car, we remove the
// car's rentals (and their payments) first, then the car itself.
async function deleteVehicleAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;
  const supabase = createClient();
  const { data: rs } = await supabase.from("rentals").select("id").eq("vehicle_id", id);
  const ids = (rs ?? []).map((r: any) => r.id);
  if (ids.length) {
    await supabase.from("payments").delete().in("rental_id", ids);
    await supabase.from("rentals").delete().eq("vehicle_id", id);
  }
  await supabase.from("vehicles").delete().eq("id", id);
  revalidatePath("/cars");
  revalidatePath("/dashboard");
  redirect("/cars");
}

export default async function CarDetailPage({ params }: { params: { id: string } }) {
  const business = await getBusiness();
  const currency = business?.currency ?? "EUR";
  const supabase = createClient();

  const { data: vData } = await supabase.from("vehicles").select("*").eq("id", params.id).maybeSingle();
  if (!vData) notFound();
  const vehicle = vData as Vehicle;

  const { data: rData } = await supabase
    .from("rentals")
    .select("*, client:clients(id, full_name)")
    .eq("vehicle_id", vehicle.id)
    .order("pickup_at", { ascending: false });

  const rentals = (rData ?? []) as any[];

  // Live status from this car's rentals (same rule as everywhere else).
  const outNow = carsOutNow(rentals);
  const reservedSoon = carsReservedSoon(rentals, outNow);
  const liveStatus = liveVehicleStatus(vehicle.status, vehicle.id, outNow, reservedSoon);

  const active = rentals.filter((r) => r.status !== "CANCELLED");
  const revenue = active.reduce((sum, r) => sum + (r.paid_cents ?? 0), 0);
  const totalDays = active.reduce((sum, r) => sum + rentalDays(r.pickup_at, r.return_at), 0);
  const current = rentals.find((r) => r.status === "ACTIVE");
  const upcoming = rentals.filter((r) => r.status === "RESERVED");
  const history = rentals.filter((r) => r.status === "COMPLETED" || r.status === "CANCELLED");

  const specs: [string, string | number | null][] = [
    ["Year", vehicle.year],
    ["Color", vehicle.color],
    ["Fuel", vehicle.fuel_type],
    ["Transmission", vehicle.transmission],
    ["Seats", vehicle.seats],
    ["Doors", vehicle.doors],
    ["Mileage", vehicle.mileage != null ? `${vehicle.mileage.toLocaleString()} km` : null],
  ];

  return (
    <div className="space-y-6">
      <Link href="/cars" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to cars
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {vehicle.make} {vehicle.model}
            </h1>
            <VehicleStatusBadge status={liveStatus as any} />
          </div>
          <p className="mt-1 text-muted-foreground">{vehicle.plate}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/cars/${vehicle.id}/edit`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-white px-4 text-sm font-medium hover:bg-muted"
          >
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Revenue collected" value={formatMoney(revenue, currency)} />
        <StatCard label="Total rental days" value={String(totalDays)} />
        <StatCard label="Daily price" value={`${formatMoney(vehicle.daily_price_cents, currency)}/day`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Change status</CardTitle>
        </CardHeader>
        <CardContent>
          <CarStatusActions id={vehicle.id} current={vehicle.status} />
          <p className="mt-3 text-xs text-muted-foreground">
            Rented / Available is set automatically from this car&apos;s rentals. Use this only to put it
            in or out of Maintenance.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              {specs
                .filter(([, v]) => v != null && v !== "")
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
            </dl>
            {vehicle.notes && (
              <p className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">{vehicle.notes}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current & upcoming</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {current && <RentalRow r={current} currency={currency} />}
            {upcoming.map((r) => (
              <RentalRow key={r.id} r={r} currency={currency} />
            ))}
            {!current && upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">No current or upcoming rentals.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rental history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No past rentals yet.</p>
          ) : (
            history.map((r) => <RentalRow key={r.id} r={r} currency={currency} />)
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-5 pt-2">
        <ConfirmButton
          action={archiveVehicle}
          id={vehicle.id}
          message="Archive this car? It will be hidden from your fleet but its history is kept."
          className="text-sm font-medium text-slate-600 hover:underline"
        >
          Archive this car
        </ConfirmButton>
        <ConfirmButton
          action={deleteVehicleAction}
          id={vehicle.id}
          message="Permanently DELETE this car? This also deletes all of its rentals and payment records and cannot be undone. (To simply hide it instead, use Archive.)"
          className="text-sm font-medium text-rose-600 hover:underline"
        >
          Delete permanently
        </ConfirmButton>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function RentalRow({ r, currency }: { r: any; currency: string }) {
  return (
    <Link
      href={`/rentals/${r.id}`}
      className="flex items-center justify-between gap-3 rounded-md border border-border p-3 hover:bg-muted"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{r.client?.full_name ?? "Client"}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(r.pickup_at)} → {formatDate(r.return_at)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <PaymentStatusBadge paid_cents={r.paid_cents} total_cents={r.total_cents} />
        <RentalStatusBadge status={r.status} />
      </div>
    </Link>
  );
}
