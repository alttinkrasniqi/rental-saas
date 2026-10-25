"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { differenceInCalendarDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

export type EditState = { error?: string };

interface CarOption {
  id: string;
  make: string;
  model: string;
  plate: string;
  daily_price_cents: number;
}
interface ClientOption {
  id: string;
  full_name: string;
}

// Split a stored timestamp into date + time fields, using UTC parts so it
// round-trips with how the server stores them.
function splitUTC(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
}

export function EditRentalForm({
  action,
  rental,
  cars,
  clients,
  currency,
}: {
  action: (prev: EditState, formData: FormData) => Promise<EditState>;
  rental: any;
  cars: CarOption[];
  clients: ClientOption[];
  currency: string;
}) {
  const t = useT();
  const [state, formAction] = useFormState(action, {} as EditState);

  const p = splitUTC(rental.pickup_at);
  const r = splitUTC(rental.return_at);

  const [clientId, setClientId] = useState<string>(rental.client_id);
  const [carId, setCarId] = useState<string>(rental.vehicle_id);
  const [pickupDate, setPickupDate] = useState(p.date);
  const [returnDate, setReturnDate] = useState(rental.open_ended ? "" : r.date);
  const [openEnded, setOpenEnded] = useState(!!rental.open_ended);
  const [dailyRate, setDailyRate] = useState((rental.daily_rate_cents / 100).toString());
  const [total, setTotal] = useState(rental.total_cents ? (rental.total_cents / 100).toString() : "");

  const days = useMemo(() => {
    if (openEnded || !pickupDate || !returnDate) return 0;
    const d = differenceInCalendarDays(new Date(returnDate), new Date(pickupDate));
    return Math.max(1, d);
  }, [pickupDate, returnDate, openEnded]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={rental.id} />

      {/* Client */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Client")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select name="client_id" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            <option value="">{t("Select a client…")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Rental period")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("Pickup date")}</Label>
              <Input type="date" name="pickup_date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Pickup time")}</Label>
              <Input type="time" name="pickup_time" defaultValue={p.time} />
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm font-medium">
            <input
              type="checkbox"
              name="open_ended"
              checked={openEnded}
              onChange={(e) => setOpenEnded(e.target.checked)}
              className="h-4 w-4"
            />
            {t("Flexible — no set return date (open-ended)")}
          </label>

          {!openEnded && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("Return date")}</Label>
                <Input type="date" name="return_date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} required={!openEnded} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Return time")}</Label>
                <Input type="time" name="return_time" defaultValue={rental.open_ended ? "18:00" : r.time} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Car */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Car")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select name="vehicle_id" value={carId} onChange={(e) => setCarId(e.target.value)} required>
            <option value="">{t("Select a car…")}</option>
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.make} {c.model} — {c.plate} ({formatMoney(c.daily_price_cents, currency)}{t("/day")})
              </option>
            ))}
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("If the car or dates clash with another booking, you'll get a warning when you save.")}
          </p>
        </CardContent>
      </Card>

      {/* Price */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Price")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("Price per day ({currency})", { currency })}</Label>
            <Input type="number" step="0.01" name="daily_rate" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} required />
          </div>
          {!openEnded && (
            <div className="space-y-1.5">
              <Label>{t("Total ({currency})", { currency })}</Label>
              <Input type="number" step="0.01" name="total" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="auto" />
              <p className="text-xs text-muted-foreground">
                {t("Clear this to recalculate as {n} × daily rate, or set a custom total.", { n: days || 0 })}
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{t("Deposit ({currency})", { currency })}</Label>
            <Input type="number" step="0.01" name="deposit" defaultValue={rental.deposit_cents ? (rental.deposit_cents / 100).toString() : ""} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Payment method")}</Label>
            <Select name="payment_method" defaultValue={rental.payment_method ?? "CASH"}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {t(m.label)}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea name="notes" defaultValue={rental.notes ?? ""} />
        </CardContent>
      </Card>

      {state.error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>}

      <div className="flex items-center gap-3">
        <SubmitButton>Save changes</SubmitButton>
        <Link
          href={`/rentals/${rental.id}`}
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-white px-4 text-sm font-medium hover:bg-muted"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
