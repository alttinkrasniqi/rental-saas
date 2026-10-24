import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Car as CarIcon, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RentalStatusBadge, PaymentStatusBadge } from "@/components/status-badges";
import { ConfirmButton } from "@/components/confirm-button";
import { RentalActions } from "./rental-actions";
import {
  formatMoney,
  formatDate,
  formatDateTime,
  rentalDays,
  remainingCents,
} from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/constants";

function methodLabel(m: string | null) {
  return PAYMENT_METHODS.find((x) => x.value === m)?.label ?? "—";
}

// Permanently delete a rental. Its payment records are removed automatically
// by the database (they are set to cascade when a rental is deleted).
async function deleteRentalAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("rentals").delete().eq("id", id);
  revalidatePath("/rentals");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  redirect("/rentals");
}

export default async function RentalDetailPage({ params }: { params: { id: string } }) {
  const business = await getBusiness();
  const currency = business?.currency ?? "EUR";
  const supabase = createClient();

  const { data: rData } = await supabase
    .from("rentals")
    .select("*, vehicle:vehicles(id, make, model, plate, year), client:clients(id, full_name, phone, email)")
    .eq("id", params.id)
    .maybeSingle();
  if (!rData) notFound();
  const r = rData as any;

  const { data: pData } = await supabase
    .from("payments")
    .select("*")
    .eq("rental_id", r.id)
    .order("paid_at", { ascending: false });
  const payments = (pData ?? []) as any[];

  const days = rentalDays(r.pickup_at, r.return_at);
  const openEnded = !!r.open_ended;
  const ongoing = openEnded && r.status === "ACTIVE";
  const liveDays = ongoing ? rentalDays(r.pickup_at, new Date()) : days;
  const displayTotal = ongoing ? liveDays * (r.daily_rate_cents ?? 0) : r.total_cents;
  const remaining = Math.max(0, displayTotal - (r.paid_cents ?? 0));
  const shortId = r.id.slice(0, 8).toUpperCase();

  return (
    <div className="space-y-6">
      <Link href="/rentals" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to rentals
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Booking #{shortId}</p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {formatDate(r.pickup_at)} → {formatDate(r.return_at)}
            </h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RentalStatusBadge status={r.status} />
            <PaymentStatusBadge paid_cents={r.paid_cents} total_cents={displayTotal} />
            {openEnded && (
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                Open-ended
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vehicle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CarIcon className="h-4 w-4" /> Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent>
            {r.vehicle ? (
              <Link href={`/cars/${r.vehicle.id}`} className="hover:underline">
                <p className="font-medium">
                  {r.vehicle.make} {r.vehicle.model} {r.vehicle.year ? `· ${r.vehicle.year}` : ""}
                </p>
                <p className="text-sm text-muted-foreground">{r.vehicle.plate}</p>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Vehicle removed</p>
            )}
          </CardContent>
        </Card>

        {/* Client */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" /> Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            {r.client ? (
              <Link href={`/clients/${r.client.id}`} className="hover:underline">
                <p className="font-medium">{r.client.full_name}</p>
                <p className="text-sm text-muted-foreground">{r.client.phone ?? r.client.email ?? ""}</p>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Client removed</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial */}
      <Card>
        <CardHeader>
          <CardTitle>Financial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Money label="Rate" value={`${formatMoney(r.daily_rate_cents, currency)}/day`} />
            <Money
              label={ongoing ? `Running total (${liveDays} ${liveDays === 1 ? "day" : "days"} so far)` : `Total (${days} ${days === 1 ? "day" : "days"})`}
              value={formatMoney(displayTotal, currency)}
            />
            <Money label="Paid" value={formatMoney(r.paid_cents, currency)} />
            <Money label="Remaining" value={formatMoney(remaining, currency)} highlight={remaining > 0} />
          </div>
          {r.deposit_cents > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">Deposit held: {formatMoney(r.deposit_cents, currency)}</p>
          )}
        </CardContent>
      </Card>

      <RentalActions
        rentalId={r.id}
        vehicleId={r.vehicle?.id ?? ""}
        status={r.status}
        clientPhone={r.client?.phone ?? null}
        remaining={remaining / 100}
        currency={currency}
      />

      {/* Payments history */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                <div>
                  <p className="font-medium">{formatMoney(p.amount_cents, currency)}</p>
                  <p className="text-xs text-muted-foreground">{methodLabel(p.method)}</p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(p.paid_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Booking meta + notes */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row k="Pickup" v={formatDateTime(r.pickup_at)} />
          {ongoing ? (
            <Row k="Return" v="Open-ended — set when returned" />
          ) : (
            <Row k="Return" v={formatDateTime(r.return_at)} />
          )}
          {r.returned_at && <Row k="Returned" v={formatDateTime(r.returned_at)} />}
          <Row k="Created" v={formatDateTime(r.created_at)} />
          {r.notes && (
            <div className="rounded-md bg-muted p-3 text-muted-foreground">{r.notes}</div>
          )}
        </CardContent>
      </Card>

      <div className="pt-2">
        <ConfirmButton
          action={deleteRentalAction}
          id={r.id}
          message="Permanently DELETE this rental? This removes it and its payment records for good and cannot be undone. (To keep a record of it but void it, use Cancel instead.)"
          className="text-sm font-medium text-rose-600 hover:underline"
        >
          Delete this rental
        </ConfirmButton>
      </div>
    </div>
  );
}

function Money({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${highlight ? "text-rose-600" : ""}`}>{value}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
