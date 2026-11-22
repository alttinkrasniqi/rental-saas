import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { getT } from "@/lib/i18n/server";
import { HandoverWizard } from "./handover-wizard";
import type { Cond } from "@/components/rental-condition";

export const dynamic = "force-dynamic";

export default async function HandoverPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { phase?: string };
}) {
  const t = getT();
  await getBusiness();
  const supabase = createClient();

  const { data: rData } = await supabase
    .from("rentals")
    .select("id, status, pickup_at, return_at, returned_at, open_ended, vehicle:vehicles(id, make, model, plate), client:clients(id, full_name, phone, email, id_number, license_number)")
    .eq("id", params.id)
    .maybeSingle();
  if (!rData) notFound();
  const r = rData as any;

  const { data: condData } = await supabase
    .from("rental_conditions")
    .select("phase, fuel, odometer, notes, photos")
    .eq("rental_id", r.id);
  const conds = (condData ?? []) as any[];
  const toCond = (phase: string): Cond => {
    const c = conds.find((x) => x.phase === phase);
    if (!c) return { fuel: null, odometer: null, notes: null, photos: [] };
    return { fuel: c.fuel ?? null, odometer: c.odometer ?? null, notes: c.notes ?? null, photos: Array.isArray(c.photos) ? c.photos : [] };
  };

  // The phase is decided by which button launched this (Dorëzim vs Rikthim).
  const phase = searchParams.phase === "return" ? "return" : "pickup";
  const car = r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}${r.vehicle.plate ? ` · ${r.vehicle.plate}` : ""}` : t("Car");

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/rentals/${r.id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("Back to rental")}
      </Link>
      <HandoverWizard
        rentalId={r.id}
        vehicleId={r.vehicle?.id ?? ""}
        car={car}
        client={{
          id: r.client?.id ?? "",
          full_name: r.client?.full_name ?? "",
          phone: r.client?.phone ?? "",
          id_number: r.client?.id_number ?? "",
          license_number: r.client?.license_number ?? "",
        }}
        cond={toCond(phase)}
        phase={phase}
      />
    </div>
  );
}
