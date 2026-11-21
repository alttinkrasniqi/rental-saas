import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Car as CarIcon, User, FileText, Receipt as ReceiptIcon, Plane, ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RentalStatusBadge, PaymentStatusBadge } from "@/components/status-badges";
import { ConfirmButton } from "@/components/confirm-button";
import { RentalActions } from "./rental-actions";
import { RentalCondition, type Cond } from "@/components/rental-condition";
import {
  formatMoney,
  formatDate,
  formatDateTime,
  rentalDays,
  remainingCents,
  effectiveStatus,
} from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";

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
  // Defense-in-depth: scope by the caller's business (RLS already enforces this).
  const { requireBusiness } = await import("@/lib/business");
  const business = await requireBusiness();
  await supabase.from("rentals").delete().eq("id", id).eq("business_id", business.id);
  const { logAudit } = await import("@/lib/audit");
  await logAudit({ action: "rental_deleted", entity: "rental", entityId: id, businessId: business.id });
  revalidatePath("/rentals");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  redirect("/rentals");
}

export default async function RentalDetailPage({ params }: { params: { id: string } }) {
  const t = getT();
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

  const { data: dData } = await supabase
    .from("deposit_transactions")
    .select("*")
    .eq("rental_id", r.id)
    .order("created_at", { ascending: false });
  const depositTx = (dData ?? []) as any[];
  const depositHeld = r.deposit_cents ?? 0;
  const depositReturned = depositTx.filter((d) => d.kind === "return").reduce((s, d) => s + (d.amount_cents ?? 0), 0);
  const depositDeducted = depositTx.filter((d) => d.kind === "deduction").reduce((s, d) => s + (d.amount_cents ?? 0), 0);
  const depositOutstanding = Math.max(0, depositHeld - depositReturned - depositDeducted);

  const { data: condData } = await supabase
    .from("rental_conditions")
    .select("phase, fuel, odometer, notes, photos")
    .eq("rental_id", r.id);
  const conds = (condData ?? []) as any[];
  const findCond = (phase: string): Cond => {
    const c = conds.find((x) => x.phase === phase);
    if (!c) return { fuel: null, odometer: null, notes: null, photos: [] };
    return {
      fuel: c.fuel ?? null,
      odometer: c.odometer ?? null,
      notes: c.notes ?? null,
      photos: Array.isArray(c.photos) ? c.photos : [],
    };
  };

  const days = rentalDays(r.pickup_at, r.return_at);
  const openEnded = !!r.open_ended;
  const effStatus = effectiveStatus(r);
  const ongoing = openEnded && effStatus === "ACTIVE";
  const liveDays = ongoing ? rentalDays(r.pickup_at, new Date()) : days;
  const displayTotal = ongoing ? liveDays * (r.daily_rate_cents ?? 0) : r.total_cents;
  const remaining = Math.max(0, displayTotal - (r.paid_cents ?? 0));
  const shortId = r.id.slice(0, 8).toUpperCase();

  return (
    <div className="space-y-6">
      <Link href="/rentals" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("Back to rentals")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{t("Booking #{id}", { id: shortId })}</p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {formatDate(r.pickup_at)} → {formatDate(r.return_at)}
            </h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RentalStatusBadge status={effStatus} />
            <PaymentStatusBadge paid_cents={r.paid_cents} total_cents={displayTotal} />
            {openEnded && (
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                {t("Open-ended")}
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
              <CarIcon className="h-4 w-4" /> {t("Vehicle")}
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
              <p className="text-sm text-muted-foreground">{t("Vehicle removed")}</p>
            )}
          </CardContent>
        </Card>

        {/* Client */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" /> {t("Client")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {r.client ? (
              <Link href={`/clients/${r.client.id}`} className="hover:underline">
                <p className="font-medium">{r.client.full_name}</p>
                <p className="text-sm text-muted-foreground">{r.client.phone ?? r.client.email ?? ""}</p>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">{t("Client removed")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Financial")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Money label={t("Rate")} value={`${formatMoney(r.daily_rate_cents, currency)}${t("/day")}`} />
            <Money
              label={
                ongoing
                  ? t(liveDays === 1 ? "Running total ({n} day so far)" : "Running total ({n} days so far)", { n: liveDays })
                  : t(days === 1 ? "Total ({n} day)" : "Total ({n} days)", { n: days })
              }
              value={formatMoney(displayTotal, currency)}
            />
            <Money label={t("Paid:label")} value={formatMoney(r.paid_cents, currency)} />
            <Money label={t("Remaining")} value={formatMoney(remaining, currency)} highlight={remaining > 0} />
          </div>
          {depositHeld > 0 && (
            <div className="mt-4 rounded-lg border border-border/70 bg-muted/40 p-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Money label={t("Deposit held")} value={formatMoney(depositHeld, currency)} />
                {depositReturned > 0 && <Money label={t("Returned")} value={formatMoney(depositReturned, currency)} />}
                {depositDeducted > 0 && <Money label={t("Kept")} value={formatMoney(depositDeducted, currency)} />}
                <Money label={t("Still holding")} value={formatMoney(depositOutstanding, currency)} />
              </div>
              {depositOutstanding > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">{t("Return it to the client, or keep part of it for damage/fuel/late — from Manage rental below.")}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents — generate & print branded PDFs for this rental. */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Documents")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <DocLink href={`/contract/${r.id}`} icon={FileText} label={t("Contract")} />
            <DocLink href={`/invoice/${r.id}`} icon={ReceiptIcon} label={t("Invoice")} />
            <DocLink href={`/authorization/${r.id}`} icon={Plane} label={t("Cross-border authorization")} />
            <DocLink href={`/protocol/${r.id}`} icon={ClipboardCheck} label={t("Handover protocol")} />
          </div>
        </CardContent>
      </Card>

      <RentalActions
        rentalId={r.id}
        vehicleId={r.vehicle?.id ?? ""}
        status={effStatus}
        clientPhone={r.client?.phone ?? null}
        remaining={remaining / 100}
        paid={(r.paid_cents ?? 0) / 100}
        depositOutstanding={depositOutstanding / 100}
        currency={currency}
      />

      {/* Car condition at pickup / return */}
      <RentalCondition rentalId={r.id} pickup={findCond("pickup")} ret={findCond("return")} />

      {/* Payments ledger (append-only: payments, refunds, corrections) */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("Payments")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {payments.map((p) => {
              const neg = (p.amount_cents ?? 0) < 0;
              const kindLabel =
                p.kind === "refund" ? t("Refund") : p.kind === "adjustment" ? t("Correction") : t("Payment");
              return (
                <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                  <div>
                    <p className={`font-semibold ${neg ? "text-rose-600" : ""}`}>{formatMoney(p.amount_cents, currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className={`font-medium ${neg ? "text-rose-600" : "text-foreground/70"}`}>{kindLabel}</span>
                      {" · "}{t(methodLabel(p.method))}
                      {p.note ? ` · ${p.note}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(p.paid_at)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Deposit movements (returns / deductions) */}
      {depositTx.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("Deposit movements")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {depositTx.map((d) => {
              const isReturn = d.kind === "return";
              return (
                <div key={d.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                  <div>
                    <p className="font-semibold">{formatMoney(d.amount_cents, currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className={`font-medium ${isReturn ? "text-emerald-600" : "text-amber-600"}`}>
                        {isReturn ? t("Returned to client") : t("Kept (deduction)")}
                      </span>
                      {d.reason ? ` · ${d.reason}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(d.created_at)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Booking meta + notes */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Details")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row k={t("Pickup")} v={formatDateTime(r.pickup_at)} />
          {ongoing ? (
            <Row k={t("Return")} v={t("Open-ended — set when returned")} />
          ) : (
            <Row k={t("Return")} v={formatDateTime(r.return_at)} />
          )}
          {r.returned_at && <Row k={t("Returned")} v={formatDateTime(r.returned_at)} />}
          <Row k={t("Created")} v={formatDateTime(r.created_at)} />
          {r.notes && (
            <div className="rounded-md bg-muted p-3 text-muted-foreground">{r.notes}</div>
          )}
        </CardContent>
      </Card>

      <div className="pt-2">
        <ConfirmButton
          action={deleteRentalAction}
          id={r.id}
          message={t("Permanently DELETE this rental? This removes it and its payment records for good and cannot be undone. (To keep a record of it but void it, use Cancel instead.)")}
          className="text-sm font-medium text-rose-600 hover:underline"
        >
          {t("Delete this rental")}
        </ConfirmButton>
      </div>
    </div>
  );
}

function DocLink({ href, icon: Icon, label }: { href: string; icon: typeof FileText; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-center transition hover:border-primary/40 hover:bg-muted/50"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-xs font-semibold leading-tight">{label}</span>
    </a>
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
