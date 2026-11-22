"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import { User, Camera, FileText, Check, ArrowRight, ArrowLeft, Scale, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { PhaseBlock, type Cond } from "@/components/rental-condition";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { updateClientDocs, completeHandover, type DocsResult } from "./actions";
import { markReturned } from "../../actions";

type Phase = "pickup" | "return";
type Client = { id: string; full_name: string; phone: string; id_number: string; license_number: string };
const FUEL = ["E", "¼", "½", "¾", "F"];
const fuelLabel = (n: number | null) => (n == null || n < 0 || n > 4 ? "—" : FUEL[n]);

export function HandoverWizard(props: {
  rentalId: string;
  vehicleId: string;
  car: string;
  clientName: string;
  client: Client;
  phase: Phase;
  pickup: Cond;
  ret: Cond;
  currency: string;
  totalCents: number;
  paidCents: number;
  remaining: number;
  depositsEnabled: boolean;
  depositHeld: number;
  depositOutstanding: number;
}) {
  const t = useT();
  const { rentalId, vehicleId, car, clientName, client, phase, pickup, ret, currency } = props;
  const isReturn = phase === "return";
  const [step, setStep] = useState(0);

  const steps = isReturn
    ? [t("Condition at return"), t("Compare & settle"), t("Finish")]
    : [t("Client & documents"), t("Car condition"), t("Documents & finish")];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{isReturn ? t("Guided return") : t("Guided pickup")}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{car}{clientName ? ` · ${clientName}` : ""}</p>
      </div>

      {/* Stepper */}
      <div className="mb-5 flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={i} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
                i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary/15 text-primary ring-2 ring-primary/40" : "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </button>
            <span className={cn("hidden text-xs font-medium sm:block", i === step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            {i < steps.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      {/* ---------------- PICKUP FLOW ---------------- */}
      {!isReturn && step === 0 && <ClientDocsStep client={client} t={t} />}
      {!isReturn && step === 1 && (
        <ConditionStep t={t} icon={Camera} title={t("Condition at pickup")} blockTitle={t("Fuel, kilometres and photos at pickup")} rentalId={rentalId} phase="pickup" initial={pickup} />
      )}
      {!isReturn && step === 2 && (
        <FinishStep
          t={t} rentalId={rentalId} isReturn={false} vehicleId={vehicleId}
          note={t("This marks the car handed over to the client.")}
          finishLabel={t("Finish pickup")}
          docs={["contract", "protocol", "authorization"]}
        />
      )}

      {/* ---------------- RETURN FLOW ---------------- */}
      {isReturn && step === 0 && (
        <ConditionStep t={t} icon={Camera} title={t("Condition at return")} blockTitle={t("Fuel, kilometres and photos at return")} rentalId={rentalId} phase="return" initial={ret} />
      )}
      {isReturn && step === 1 && <CompareSettleStep {...props} t={t} />}
      {isReturn && step === 2 && (
        <FinishStep
          t={t} rentalId={rentalId} isReturn={true} vehicleId={vehicleId}
          note={t("This closes the rental and frees the car.")}
          finishLabel={t("Finish return")}
          docs={["protocol", "invoice"]}
        />
      )}

      {/* Nav */}
      <div className="mt-5 flex items-center justify-between">
        <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" /> {t("Back")}
        </Button>
        {step < steps.length - 1 ? (
          <Button type="button" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>
            {t("Next")} <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

// ---- Pickup: capture renter identity ----
function ClientDocsStep({ client, t }: { client: Client; t: (k: string) => string }) {
  const [docsState, docsAction] = useFormState(updateClientDocs, {} as DocsResult);
  return (
    <Card className="rounded-2xl">
      <StepHead icon={User} title={t("Client & documents")} />
      <CardContent className="p-5">
        <p className="mb-4 text-sm"><b>{client.full_name || "—"}</b>{client.phone ? ` · ${client.phone}` : ""}</p>
        <form action={docsAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="client_id" value={client.id} />
          <div className="space-y-1.5">
            <Label>{t("ID number")}</Label>
            <Input name="id_number" defaultValue={client.id_number} placeholder={t("ID / passport")} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("License number")}</Label>
            <Input name="license_number" defaultValue={client.license_number} placeholder={t("e.g. KS-998877")} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <SubmitButton>{t("Save documents")}</SubmitButton>
            {docsState.ok && <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600"><Check className="h-4 w-4" /> {t("Saved")}</span>}
            {docsState.error && <span className="text-sm text-rose-600">{docsState.error}</span>}
          </div>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">{t("Check the renter's ID and driving licence before handing over the car.")}</p>
      </CardContent>
    </Card>
  );
}

// ---- Shared condition capture (reuses the existing block) ----
function ConditionStep({ t, icon: Icon, title, blockTitle, rentalId, phase, initial }: any) {
  return (
    <Card className="rounded-2xl">
      <StepHead icon={Icon} title={title} />
      <CardContent className="p-5">
        <PhaseBlock rentalId={rentalId} phase={phase} title={blockTitle} initial={initial} />
      </CardContent>
    </Card>
  );
}

// ---- Return: compare pickup vs return + show what's owed ----
function CompareSettleStep(props: any) {
  const { t, pickup, ret, currency, totalCents, paidCents, remaining, depositsEnabled, depositHeld, depositOutstanding, rentalId } = props;
  const kmDriven = pickup.odometer != null && ret.odometer != null ? ret.odometer - pickup.odometer : null;
  const row = (label: string, a: string, b: string) => (
    <tr className="border-t border-border/50">
      <td className="py-2 pr-3 text-sm text-muted-foreground">{label}</td>
      <td className="py-2 text-center text-sm font-semibold">{a}</td>
      <td className="py-2 text-center text-sm font-semibold">{b}</td>
    </tr>
  );
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl">
        <StepHead icon={Scale} title={t("Compare pickup vs return")} />
        <CardContent className="p-5">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <th></th><th className="pb-1 font-semibold">{t("Pickup")}</th><th className="pb-1 font-semibold">{t("Return")}</th>
              </tr>
            </thead>
            <tbody>
              {row(t("Fuel"), fuelLabel(pickup.fuel), fuelLabel(ret.fuel))}
              {row(t("Odometer (km)"), pickup.odometer != null ? String(pickup.odometer) : "—", ret.odometer != null ? String(ret.odometer) : "—")}
            </tbody>
          </table>
          {kmDriven != null && <p className="mt-3 text-sm">{t("Kilometres driven")}: <b>{kmDriven} km</b></p>}
          {ret.notes && <p className="mt-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground"><b>{t("Damage / notes")}:</b> {ret.notes}</p>}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <StepHead icon={Wallet} title={t("Settle up")} />
        <CardContent className="space-y-3 p-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label={t("Total")} value={formatMoney(totalCents, currency)} />
            <Stat label={t("Paid:label")} value={formatMoney(paidCents, currency)} />
            <Stat label={t("Remaining")} value={formatMoney(remaining, currency)} tone={remaining > 0 ? "text-rose-600" : "text-emerald-600"} />
          </div>
          {depositsEnabled && depositHeld > 0 && (
            <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-sm">
              {t("Deposit held")}: <b>{formatMoney(depositHeld, currency)}</b>
              {depositOutstanding > 0 ? <> · {t("Still holding")}: <b>{formatMoney(depositOutstanding, currency)}</b></> : null}
            </div>
          )}
          {(remaining > 0 || (depositsEnabled && depositOutstanding > 0)) && (
            <p className="text-xs text-muted-foreground">
              {t("Collect the balance and handle the deposit on the rental page before closing.")}{" "}
              <Link href={`/rentals/${rentalId}`} className="font-semibold text-primary hover:underline">{t("Open rental")}</Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Final step (documents + the real finish action) ----
function FinishStep({ t, rentalId, isReturn, vehicleId, note, finishLabel, docs }: any) {
  const docMap: Record<string, { href: string; label: string }> = {
    contract: { href: `/contract/${rentalId}`, label: t("Contract") },
    protocol: { href: `/protocol/${rentalId}`, label: t("Handover protocol") },
    authorization: { href: `/authorization/${rentalId}`, label: t("Cross-border authorization") },
    invoice: { href: `/invoice/${rentalId}`, label: t("Invoice") },
  };
  return (
    <Card className="rounded-2xl">
      <StepHead icon={FileText} title={isReturn ? t("Finish") : t("Documents & finish")} />
      <CardContent className="p-5">
        <p className="mb-3 text-sm text-muted-foreground">{t("Print and sign before the car leaves.")}</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {docs.map((d: string) => (
            <a key={d} href={docMap[d].href} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-border p-3 text-center text-sm font-semibold transition hover:border-primary/40 hover:bg-muted/50">
              <FileText className="h-4 w-4 text-primary" /> {docMap[d].label}
            </a>
          ))}
        </div>
        <div className="mt-6 border-t border-border/60 pt-5">
          {isReturn ? (
            <form action={markReturned}>
              <input type="hidden" name="rental_id" value={rentalId} />
              <input type="hidden" name="vehicle_id" value={vehicleId} />
              <SubmitButton className="h-11 px-6 text-base"><Check className="h-5 w-5" /> {finishLabel}</SubmitButton>
            </form>
          ) : (
            <form action={completeHandover}>
              <input type="hidden" name="rental_id" value={rentalId} />
              <SubmitButton className="h-11 px-6 text-base"><Check className="h-5 w-5" /> {finishLabel}</SubmitButton>
            </form>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{note}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StepHead({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border/70 p-2.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold", tone)}>{value}</p>
    </div>
  );
}
