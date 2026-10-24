"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { cn } from "@/lib/utils";
import { createRental, type RentalFormState } from "./actions";

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
interface Booking {
  vehicle_id: string;
  pickup_at: string;
  return_at: string;
  client_name: string | null;
}

export function RentalForm({
  cars,
  clients,
  bookings,
  currency,
  preselectClientId,
  preselectVehicleId,
  presetPickupDate,
}: {
  cars: CarOption[];
  clients: ClientOption[];
  bookings: Booking[];
  currency: string;
  preselectClientId?: string;
  preselectVehicleId?: string;
  presetPickupDate?: string;
}) {
  const [state, formAction] = useFormState(createRental, {} as RentalFormState);

  const presetCar = cars.find((c) => c.id === preselectVehicleId);
  const [clientId, setClientId] = useState(preselectClientId ?? "");
  const [carId, setCarId] = useState(presetCar ? presetCar.id : "");
  const [pickupDate, setPickupDate] = useState(presetPickupDate ?? "");
  const [returnDate, setReturnDate] = useState("");
  const [openEnded, setOpenEnded] = useState(false);
  const [dailyRate, setDailyRate] = useState(
    presetCar ? (presetCar.daily_price_cents / 100).toString() : ""
  );
  const [total, setTotal] = useState("");
  const [totalTouched, setTotalTouched] = useState(false);
  const [paid, setPaid] = useState("");

  const days = useMemo(() => {
    if (openEnded || !pickupDate || !returnDate) return 0;
    const d = differenceInCalendarDays(new Date(returnDate), new Date(pickupDate));
    return Math.max(1, d);
  }, [pickupDate, returnDate, openEnded]);

  // Can we check car availability yet? Need a pickup date, plus a return date
  // (unless the rental is open-ended).
  const canCheck = !!pickupDate && (openEnded || !!returnDate);

  function bookingFor(id: string): { by: string | null } | null {
    if (!canCheck) return null;
    const selStart = new Date(`${pickupDate}T00:00:00`);
    const selEnd = openEnded ? new Date(8640000000000000) : new Date(`${returnDate}T23:59:59`);
    for (const b of bookings) {
      if (b.vehicle_id !== id) continue;
      const bStart = new Date(b.pickup_at);
      const bEnd = new Date(b.return_at);
      if (bStart < selEnd && bEnd > selStart) return { by: b.client_name };
    }
    return null;
  }

  // If the chosen car becomes unavailable after the dates change, unselect it.
  useEffect(() => {
    if (carId && bookingFor(carId)) setCarId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupDate, returnDate, openEnded]);

  function selectCar(id: string) {
    setCarId(id);
    const car = cars.find((c) => c.id === id);
    if (car && !dailyRate) setDailyRate((car.daily_price_cents / 100).toString());
  }

  const rateNum = Number(dailyRate.replace(",", ".")) || 0;
  const computedTotal = days > 0 ? days * rateNum : 0;
  const effectiveTotal = totalTouched ? Number(total.replace(",", ".")) || 0 : computedTotal;
  const paidNum = Number(paid.replace(",", ".")) || 0;
  const remaining = Math.max(0, effectiveTotal - paidNum);

  const selectedCar = cars.find((c) => c.id === carId);
  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        {/* 1. Client */}
        <Card>
          <CardHeader>
            <CardTitle>1 · Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select name="client_id" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              <option value="">Select a client…</option>
              <option value="__new__">➕ Add a new client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </Select>
            {clientId === "__new__" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>New client name</Label>
                  <Input name="new_client_name" placeholder="John Smith" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input name="new_client_phone" placeholder="+383 4X XXX XXX" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Dates */}
        <Card>
          <CardHeader>
            <CardTitle>2 · Rental period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Pickup date</Label>
                <Input type="date" name="pickup_date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Pickup time</Label>
                <Input type="time" name="pickup_time" defaultValue="09:00" />
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
              Flexible — no set return date (open-ended)
            </label>

            {openEnded ? (
              <p className="text-sm text-muted-foreground">
                The car stays out until you mark it returned. The total adds up automatically,
                one day at a time, from the pickup date.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Return date</Label>
                  <Input type="date" name="return_date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} required={!openEnded} />
                </div>
                <div className="space-y-1.5">
                  <Label>Return time</Label>
                  <Input type="time" name="return_time" defaultValue="18:00" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Car (with availability for the chosen dates) */}
        <Card>
          <CardHeader>
            <CardTitle>3 · Car</CardTitle>
          </CardHeader>
          <CardContent>
            {cars.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You have no cars yet.{" "}
                <Link href="/cars/new" className="text-primary hover:underline">
                  Add a car first
                </Link>
                .
              </p>
            ) : !canCheck ? (
              <p className="text-sm text-muted-foreground">
                Choose your dates above and the free cars will appear here.
              </p>
            ) : (
              <div className="space-y-2">
                {cars.map((c) => {
                  const booked = bookingFor(c.id);
                  const selected = carId === c.id;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      disabled={!!booked}
                      onClick={() => selectCar(c.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors",
                        selected ? "border-primary ring-2 ring-primary/30" : "border-input",
                        booked ? "cursor-not-allowed opacity-60" : "hover:bg-muted"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {c.make} {c.model} <span className="text-muted-foreground">{c.plate}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{formatMoney(c.daily_price_cents, currency)}/day</p>
                      </div>
                      {booked ? (
                        <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                          Booked{booked.by ? ` · ${booked.by}` : ""}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          Available
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <input type="hidden" name="vehicle_id" value={carId} />
          </CardContent>
        </Card>

        {/* 4. Money */}
        <Card>
          <CardHeader>
            <CardTitle>4 · Price & payment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Price per day ({currency})</Label>
              <Input
                type="number"
                step="0.01"
                name="daily_rate"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                placeholder="60"
                required
              />
            </div>
            {!openEnded && (
              <div className="space-y-1.5">
                <Label>Total ({currency})</Label>
                <Input
                  type="number"
                  step="0.01"
                  name="total"
                  value={totalTouched ? total : computedTotal ? String(computedTotal) : ""}
                  onChange={(e) => {
                    setTotalTouched(true);
                    setTotal(e.target.value);
                  }}
                  placeholder="auto"
                />
                <p className="text-xs text-muted-foreground">Leave as-is for {days || 0} × daily rate, or type a custom total.</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Deposit ({currency})</Label>
              <Input type="number" step="0.01" name="deposit" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Amount paid now ({currency})</Label>
              <Input
                type="number"
                step="0.01"
                name="paid"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Payment method</Label>
              <Select name="payment_method" defaultValue="CASH">
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea name="notes" placeholder="Anything to remember about this rental" />
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SummaryRow label="Client" value={clientId === "__new__" ? "New client" : selectedClient?.full_name ?? "—"} />
              <SummaryRow label="Duration" value={openEnded ? "Open-ended" : days ? `${days} ${days === 1 ? "day" : "days"}` : "—"} />
              <SummaryRow
                label="Car"
                value={selectedCar ? `${selectedCar.make} ${selectedCar.model}` : "—"}
              />
              {selectedCar && <p className="-mt-2 text-xs text-muted-foreground">{selectedCar.plate}</p>}
              <div className="border-t border-border" />
              <SummaryRow label="Rate" value={rateNum ? `${formatMoney(rateNum * 100, currency)}/day` : "—"} />
              {openEnded ? (
                <SummaryRow label="Total" value="Adds up daily" strong />
              ) : (
                <SummaryRow label="Total" value={formatMoney(effectiveTotal * 100, currency)} strong />
              )}
              <SummaryRow label="Paid" value={formatMoney(paidNum * 100, currency)} />
              {!openEnded && <SummaryRow label="Remaining" value={formatMoney(remaining * 100, currency)} strong />}

              {state.error && (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
              )}
              <SubmitButton className="mt-2 w-full">Confirm rental</SubmitButton>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}
