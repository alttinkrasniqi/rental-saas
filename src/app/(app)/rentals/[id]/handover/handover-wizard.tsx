"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { User, Camera, FileText, Check, ArrowRight, ArrowLeft, ClipboardCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { PhaseBlock, type Cond } from "@/components/rental-condition";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { updateClientDocs, completeHandover, type DocsResult } from "./actions";
import { markReturned } from "../../actions";

type Phase = "pickup" | "return";
type Client = { id: string; full_name: string; phone: string; id_number: string; license_number: string };

export function HandoverWizard({
  rentalId, vehicleId, car, client, cond, phase,
}: {
  rentalId: string;
  vehicleId: string;
  car: string;
  client: Client;
  cond: Cond;
  phase: Phase;
}) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [docsState, docsAction] = useFormState(updateClientDocs, {} as DocsResult);

  const isReturn = phase === "return";
  const steps = [t("Client & documents"), t("Car condition"), t("Documents & finish")];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{isReturn ? t("Guided return") : t("Guided pickup")}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{car}</p>
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

      {/* Step 1 — client & documents */}
      {step === 0 && (
        <Card className="rounded-2xl">
          <div className="flex items-center gap-2 border-b border-border/60 p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><User className="h-4 w-4" /></span>
            <h3 className="text-sm font-semibold">{t("Client & documents")}</h3>
          </div>
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
      )}

      {/* Step 2 — car condition (reuses the existing capture block) */}
      {step === 1 && (
        <Card className="rounded-2xl">
          <div className="flex items-center gap-2 border-b border-border/60 p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Camera className="h-4 w-4" /></span>
            <h3 className="text-sm font-semibold">{isReturn ? t("Condition at return") : t("Condition at pickup")}</h3>
          </div>
          <CardContent className="p-5">
            <PhaseBlock
              rentalId={rentalId}
              phase={phase}
              title={isReturn ? t("Fuel, kilometres and photos at return") : t("Fuel, kilometres and photos at pickup")}
              initial={cond}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 3 — documents & finish */}
      {step === 2 && (
        <Card className="rounded-2xl">
          <div className="flex items-center gap-2 border-b border-border/60 p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-4 w-4" /></span>
            <h3 className="text-sm font-semibold">{t("Documents & finish")}</h3>
          </div>
          <CardContent className="p-5">
            <p className="mb-3 text-sm text-muted-foreground">{t("Print and sign before the car leaves.")}</p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <DocBtn href={`/contract/${rentalId}`} icon={FileText} label={t("Contract")} />
              <DocBtn href={`/protocol/${rentalId}`} icon={ClipboardCheck} label={t("Handover protocol")} />
              <DocBtn href={`/authorization/${rentalId}`} icon={FileText} label={t("Cross-border authorization")} />
            </div>
            <div className="mt-6 border-t border-border/60 pt-5">
              {isReturn ? (
                <form action={markReturned}>
                  <input type="hidden" name="rental_id" value={rentalId} />
                  <input type="hidden" name="vehicle_id" value={vehicleId} />
                  <SubmitButton className="h-11 px-6 text-base">
                    <Check className="h-5 w-5" /> {t("Finish return")}
                  </SubmitButton>
                </form>
              ) : (
                <form action={completeHandover}>
                  <input type="hidden" name="rental_id" value={rentalId} />
                  <SubmitButton className="h-11 px-6 text-base">
                    <Check className="h-5 w-5" /> {t("Finish pickup")}
                  </SubmitButton>
                </form>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {isReturn ? t("This closes the rental and frees the car.") : t("This marks the car handed over to the client.")}
              </p>
            </div>
          </CardContent>
        </Card>
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

function DocBtn({ href, icon: Icon, label }: { href: string; icon: typeof FileText; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 rounded-xl border border-border p-3 text-center text-sm font-semibold transition hover:border-primary/40 hover:bg-muted/50"
    >
      <Icon className="h-4 w-4 text-primary" /> {label}
    </a>
  );
}
