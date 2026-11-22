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
  const business = await getBusiness();
  const currency = business?.currency ?? "EUR";
  const depositsEnabled = !!business?.deposits_enabled;
  const supabase = createClient();

  const { data: rData } = await supabase
    .from("rentals")
    .select("id, status, pickup_at, return_at, returned_at, open_ended, total_cents, paid_cents, deposit_cents, vehicle:vehicles(id, make, model, plate), client:clients(id, full_name, phone, email, id_number, license_number)")
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

  const phase = searchParams.phase === "return" ? "return" : "pickup";

  // Deposit outstanding (only needed to show at return, when enabled).
  let depositOutstanding = 0;
  const depositHeld = r.deposit_cents ?? 0;
  if (phase === "return" && depositsEnabled && depositHeld > 0) {
    const { data: tx } = await supabase.from("deposit_transactions").select("amount_cents").eq("rental_id", r.id);
    const out = (tx ?? []).reduce((s: number, x: any) => s + (x.amount_cents ?? 0), 0);
    depositOutstanding = Math.max(0, depositHeld - out);
  }

  const car = r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}${r.vehicle.plate ? ` · ${r.vehicle.plate}` : ""}` : t("Car");
  const remaining = Math.max(0, (r.total_cents ?? 0) - (r.paid_cents ?? 0));

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/rentals/${r.id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("Back to rental")}
      </Link>
      <HandoverWizard
        rentalId={r.id}
        vehicleId={r.vehicle?.id ?? ""}
        car={car}
        clientName={r.client?.full_name ?? ""}
        client={{
          id: r.client?.id ?? "",
          full_name: r.client?.full_name ?? "",
          phone: r.client?.phone ?? "",
          id_number: r.client?.id_number ?? "",
          license_number: r.client?.license_number ?? "",
        }}
        phase={phase}
        pickup={toCond("pickup")}
        ret={toCond("return")}
        currency={currency}
        totalCents={r.total_cents ?? 0}
        paidCents={r.paid_cents ?? 0}
        remaining={remaining}
        depositsEnabled={depositsEnabled}
        depositHeld={depositHeld}
        depositOutstanding={depositOutstanding}
      />
    </div>
  );
}
