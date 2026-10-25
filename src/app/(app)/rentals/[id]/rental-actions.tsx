"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import { Phone, CreditCard, CheckCircle2, CalendarClock, XCircle, Pencil, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmButton } from "@/components/confirm-button";
import { PAYMENT_METHODS } from "@/lib/constants";
import { recordPayment, markReturned, extendRental, cancelRental, type RentalFormState } from "../actions";
import { useT } from "@/lib/i18n/provider";

type Panel = "payment" | "return" | "extend" | null;

export function RentalActions({
  rentalId,
  vehicleId,
  status,
  clientPhone,
  remaining,
  currency,
}: {
  rentalId: string;
  vehicleId: string;
  status: string;
  clientPhone: string | null;
  remaining: number;
  currency: string;
}) {
  const t = useT();
  const [panel, setPanel] = useState<Panel>(null);
  const [extendState, extendAction] = useFormState(extendRental, {} as RentalFormState);

  const isOpen = status === "ACTIVE" || status === "RESERVED";
  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Manage rental")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/rentals/${rentalId}/edit`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-white px-4 text-sm font-medium hover:bg-muted"
          >
            <Pencil className="h-4 w-4" /> {t("Edit")}
          </Link>
          <a
            href={`/contract/${rentalId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-white px-4 text-sm font-medium hover:bg-muted"
          >
            <FileText className="h-4 w-4" /> {t("Kontrata")}
          </a>
          {remaining > 0 && (
            <Button type="button" variant="outline" onClick={() => toggle("payment")}>
              <CreditCard className="h-4 w-4" /> {t("Record payment")}
            </Button>
          )}
          {isOpen && (
            <Button type="button" variant="outline" onClick={() => toggle("return")}>
              <CheckCircle2 className="h-4 w-4" /> {t("Mark returned")}
            </Button>
          )}
          {isOpen && (
            <Button type="button" variant="outline" onClick={() => toggle("extend")}>
              <CalendarClock className="h-4 w-4" /> {t("Extend")}
            </Button>
          )}
          {clientPhone && (
            <a
              href={`tel:${clientPhone}`}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-white px-4 text-sm font-medium hover:bg-muted"
            >
              <Phone className="h-4 w-4" /> {t("Call client")}
            </a>
          )}
        </div>

        {panel === "payment" && (
          <form action={recordPayment} className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2">
            <input type="hidden" name="rental_id" value={rentalId} />
            <div className="space-y-1.5">
              <Label>{t("Amount ({currency})", { currency })}</Label>
              <Input type="number" step="0.01" name="amount" placeholder={String(remaining)} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Method")}</Label>
              <Select name="method" defaultValue="CASH">
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {t(m.label)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <SubmitButton>{t("Save payment")}</SubmitButton>
            </div>
          </form>
        )}

        {panel === "return" && (
          <form action={markReturned} className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2">
            <input type="hidden" name="rental_id" value={rentalId} />
            <input type="hidden" name="vehicle_id" value={vehicleId} />
            <div className="space-y-1.5">
              <Label>{t("Return mileage (optional)")}</Label>
              <Input type="number" name="return_mileage" placeholder="e.g. 121500" />
            </div>
            <div className="flex items-end">
              <SubmitButton>{t("Confirm return")}</SubmitButton>
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              {t("This completes the rental and marks the car available again.")}
            </p>
          </form>
        )}

        {panel === "extend" && (
          <form action={extendAction} className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2">
            <input type="hidden" name="rental_id" value={rentalId} />
            <input type="hidden" name="vehicle_id" value={vehicleId} />
            <div className="space-y-1.5">
              <Label>{t("New return date")}</Label>
              <Input type="date" name="return_date" required />
            </div>
            <div className="space-y-1.5">
              <Label>{t("New return time")}</Label>
              <Input type="time" name="return_time" defaultValue="18:00" />
            </div>
            {extendState.error && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2">
                {extendState.error}
              </p>
            )}
            <div className="sm:col-span-2">
              <SubmitButton>{t("Extend rental")}</SubmitButton>
            </div>
          </form>
        )}

        {status !== "CANCELLED" && status !== "COMPLETED" && (
          <div className="pt-1">
            <ConfirmButton
              action={cancelRental}
              id={rentalId}
              message={t("Cancel this rental? The car will be freed up.")}
              className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:underline"
            >
              <XCircle className="h-4 w-4" /> {t("Cancel rental")}
            </ConfirmButton>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
