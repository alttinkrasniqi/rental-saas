"use client";

import { useFormState } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { updateBusiness, type SettingsState } from "./actions";
import type { Business } from "@/lib/types";

export function SettingsForm({ business }: { business: Business }) {
  const [state, formAction] = useFormState(updateBusiness, {} as SettingsState);

  return (
    <form action={formAction} className="space-y-5">
      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Business name</Label>
            <Input name="name" defaultValue={business.name} required />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input name="phone" defaultValue={business.phone ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input name="email" type="email" defaultValue={business.email ?? ""} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Address</Label>
            <Input name="address" defaultValue={business.address ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select name="currency" defaultValue={business.currency}>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CHF">CHF</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Select name="timezone" defaultValue={business.timezone}>
              <option value="Europe/Tirane">Kosovo / Albania (Tirana)</option>
              <option value="Europe/Zurich">Switzerland</option>
              <option value="Europe/Berlin">Germany</option>
              <option value="UTC">UTC</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved.</p>
      )}
      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
