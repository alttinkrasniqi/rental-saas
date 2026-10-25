"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { VEHICLE_STATUSES, VEHICLE_STATUS_META, FUEL_TYPES, TRANSMISSIONS } from "@/lib/constants";
import type { Vehicle } from "@/lib/types";
import type { VehicleFormState } from "./actions";
import { useT } from "@/lib/i18n/provider";

type Action = (prev: VehicleFormState, formData: FormData) => Promise<VehicleFormState>;

export function CarForm({
  action,
  vehicle,
  submitLabel,
}: {
  action: Action;
  vehicle?: Vehicle;
  submitLabel: string;
}) {
  const t = useT();
  const [state, formAction] = useFormState(action, {} as VehicleFormState);
  const priceValue = vehicle ? (vehicle.daily_price_cents / 100).toString() : "";

  return (
    <form action={formAction} className="space-y-5">
      {vehicle && <input type="hidden" name="id" value={vehicle.id} />}

      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
          <Field label={t("Make")} required>
            <Input name="make" defaultValue={vehicle?.make} placeholder="BMW" required />
          </Field>
          <Field label={t("Model")} required>
            <Input name="model" defaultValue={vehicle?.model} placeholder="5 Series" required />
          </Field>
          <Field label={t("Registration plate")} required>
            <Input name="plate" defaultValue={vehicle?.plate} placeholder="01-777-KS" required />
          </Field>
          <Field label={t("Year")}>
            <Input name="year" type="number" defaultValue={vehicle?.year ?? ""} placeholder="2020" />
          </Field>
          <Field label={t("Daily price (€)")} required>
            <Input name="daily_price" type="number" step="0.01" defaultValue={priceValue} placeholder="60" required />
          </Field>
          <Field label={t("Status")}>
            <Select name="status" defaultValue={vehicle?.status ?? "AVAILABLE"}>
              {VEHICLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(VEHICLE_STATUS_META[s].label)}
                </option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
          <Field label={t("Color")}>
            <Input name="color" defaultValue={vehicle?.color ?? ""} placeholder="Black" />
          </Field>
          <Field label={t("Mileage (km)")}>
            <Input name="mileage" type="number" defaultValue={vehicle?.mileage ?? ""} placeholder="120000" />
          </Field>
          <Field label={t("Fuel type")}>
            <Select name="fuel_type" defaultValue={vehicle?.fuel_type ?? ""}>
              <option value="">—</option>
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("Transmission")}>
            <Select name="transmission" defaultValue={vehicle?.transmission ?? ""}>
              <option value="">—</option>
              {TRANSMISSIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("Seats")}>
            <Input name="seats" type="number" defaultValue={vehicle?.seats ?? ""} placeholder="5" />
          </Field>
          <Field label={t("Doors")}>
            <Input name="doors" type="number" defaultValue={vehicle?.doors ?? ""} placeholder="4" />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("Notes")}>
              <Textarea name="notes" defaultValue={vehicle?.notes ?? ""} placeholder={t("Anything worth remembering about this car")} />
            </Field>
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link
          href={vehicle ? `/cars/${vehicle.id}` : "/cars"}
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-white px-4 text-sm font-medium hover:bg-muted"
        >
          {t("Cancel")}
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </Label>
      {children}
    </div>
  );
}
