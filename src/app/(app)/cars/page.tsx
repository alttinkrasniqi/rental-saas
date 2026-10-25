import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Car } from "lucide-react";
import { CarsList } from "./cars-list";
import type { Vehicle } from "@/lib/types";
import { carsOutNow, carsReservedSoon, liveVehicleStatus } from "@/lib/availability";
import { getT } from "@/lib/i18n/server";

export default async function CarsPage() {
  const t = getT();
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
        title={t("Cars")}
        subtitle={t(vehicles.length === 1 ? "{n} vehicle in your fleet" : "{n} vehicles in your fleet", { n: vehicles.length })}
        action={{ href: "/cars/new", label: t("Add car") }}
      />
      {vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title={t("No cars yet")}
          description={t("Add your first car to start managing your fleet.")}
          action={{ href: "/cars/new", label: t("Add car") }}
        />
      ) : (
        <CarsList vehicles={vehicles} currency={business?.currency ?? "EUR"} />
      )}
    </div>
  );
}
