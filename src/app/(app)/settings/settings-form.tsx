"use client";

import { useFormState } from "react-dom";
import { Store, ReceiptText, Wallet } from "lucide-react";
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
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-start gap-3 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Store className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight">{t("Business profile")}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("Name, contact and currency used across the app.")}</p>
          </div>
        </div>
        <div className="grid gap-4 border-t border-border/60 p-5 sm:grid-cols-2">
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
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-start gap-3 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
            <ReceiptText className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight">{t("Fiscal details (for invoices)")}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("Shown on invoices you issue to clients.")}</p>
          </div>
        </div>
        <div className="grid gap-4 border-t border-border/60 p-5 sm:grid-cols-2">
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
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-start gap-3 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight">{t("Operations")}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("Optional tools you can switch on if your business uses them.")}</p>
          </div>
        </div>
        <div className="border-t border-border/60 p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="deposits_enabled"
              defaultChecked={!!business.deposits_enabled}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-input accent-primary"
            />
            <span>
              <span className="block text-sm font-medium">{t("Track security deposits")}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t("Off by default. Turn on only if you take a deposit as collateral — adds a deposit field to bookings and lets you return or deduct it. Most rentals in the region don't use this.")}
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>{t("Save changes")}</SubmitButton>
        {state.error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{state.error}</p>
        )}
        {state.ok && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{t("Saved.")}</p>
        )}
      </div>
    </form>
  );
}
