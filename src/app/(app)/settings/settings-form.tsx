"use client";

import { useFormState } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { updateBusiness, type SettingsState } from "./actions";
import type { Business } from "@/lib/types";
import { useT } from "@/lib/i18n/provider";

export function SettingsForm({ business }: { business: Business }) {
  const t = useT();
  const [state, formAction] = useFormState(updateBusiness, {} as SettingsState);

  return (
    <form action={formAction} className="space-y-5">
      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("Business name")}</Label>
            <Input name="name" defaultValue={business.name} required />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Phone")}</Label>
            <Input name="phone" defaultValue={business.phone ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Email")}</Label>
            <Input name="email" type="email" defaultValue={business.email ?? ""} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("Address")}</Label>
            <Input name="address" defaultValue={business.address ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Currency")}</Label>
            <Select name="currency" defaultValue={business.currency}>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CHF">CHF</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("Timezone")}</Label>
            <Select name="timezone" defaultValue={business.timezone}>
              <option value="Europe/Tirane">Kosovo / Albania (Tirana)</option>
              <option value="Europe/Zurich">Switzerland</option>
              <option value="Europe/Berlin">Germany</option>
              <option value="UTC">UTC</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("Fiscal details (for invoices)")}</Label>
            <p className="text-xs text-muted-foreground">{t("Shown on invoices you issue to clients.")}</p>
          </div>
          <div className="space-y-1.5">
            <Label>{t("Business number (NUI)")}</Label>
            <Input name="business_no" defaultValue={business.business_no ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Fiscal number")}</Label>
            <Input name="fiscal_number" defaultValue={business.fiscal_number ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("VAT number")}</Label>
            <Input name="vat_number" defaultValue={business.vat_number ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("VAT rate (%)")}</Label>
            <Input name="vat_rate" type="number" min="0" max="100" defaultValue={String(business.vat_rate ?? 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Bank")}</Label>
            <Input name="bank_name" defaultValue={business.bank_name ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("IBAN")}</Label>
            <Input name="bank_iban" defaultValue={business.bank_iban ?? ""} />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{t("Saved.")}</p>
      )}
      <SubmitButton>{t("Save changes")}</SubmitButton>
    </form>
  );
}
