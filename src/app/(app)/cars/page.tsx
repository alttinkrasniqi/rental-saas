import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Car } from "lucide-react";
import { CarsList } from "./cars-list";
import type { Vehicle } from "@/lib/types";
import { carsOutNow, carsReservedSoon, liveVehicleStatus } from "@/lib/availability";

export default async function CarsPage() {
  const business = await getBusiness();
  const supabase = createClient();

  const [{ data: vData }, { data: rData }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("archived", false).order("make", { ascending: true }),
    supabase
      .from("rentals")
      .select("vehicle_id, status, pickup_at, return_at, open_ended")
      .in("status", ["ACTIVE", "RESERVED"]),
  ]);

  let vehicles = (vData ?? []) as Vehicle[];
  const rentals = rData ?? [];
  const outNow = carsOutNow(rentals);
  const reservedSoon = carsReservedSoon(rentals, outNow);

  vehicles = vehicles.map((v: any) => ({
    ...v,
    status: liveVehicleStatus(v.status, v.id, outNow, reservedSoon),
  })) as Vehicle[];

  return (
    <div>
      <PageHeader
        title="Cars"
        subtitle={`${vehicles.length} ${vehicles.length === 1 ? "vehicle" : "vehicles"} in your fleet`}
        action={{ href: "/cars/new", label: "Add car" }}
      />
      {vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No cars yet"
          description="Add your first car to start managing your fleet."
          action={{ href: "/cars/new", label: "Add car" }}
        />
      ) : (
        <CarsList vehicles={vehicles} currency={business?.currency ?? "EUR"} />
      )}
    </div>
  );
}
