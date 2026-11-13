"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { formatMoney } from "@/lib/format";
import { Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { createPriceRule, deletePriceRule, type PriceRuleState } from "./actions";
import type { PriceRule } from "@/lib/pricing";

interface Car {
  id: string;
  make: string;
  model: string;
  plate: string;
}

export function PriceRules({
  cars,
  rules,
  currency,
}: {
  cars: Car[];
  rules: PriceRule[];
  currency: string;
}) {
  const t = useT();
  const [state, formAction] = useFormState(createPriceRule, {} as PriceRuleState);
  const [adjustType, setAdjustType] = useState<"percent" | "fixed_daily">("percent");

  const carName = (id: string | null) => {
    if (!id) return t("All cars");
    const c = cars.find((x) => x.id === id);
    return c ? `${c.make} ${c.model}` : t("Car");
  };
  const fmtAdjust = (r: PriceRule) =>
    r.adjust_type === "percent"
      ? `${r.adjust_value > 0 ? "+" : ""}${r.adjust_value}%`
      : `${formatMoney(r.adjust_value, currency)}${t("/day")}`;
  const period = (r: PriceRule) =>
    r.end_date ? `${r.start_date} → ${r.end_date}` : `${r.start_date} — ${t("onward")}`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Create */}
      <Card>
        <CardHeader>
          <CardTitle>{t("New price rule")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("Applies to")}</Label>
              <Select name="vehicle_id" defaultValue="__all__">
                <option value="__all__">{t("All cars")}</option>
                {cars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.make} {c.model} · {c.plate}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("From")}</Label>
                <Input type="date" name="start_date" required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("To (optional)")}</Label>
                <Input type="date" name="end_date" />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">{t("Leave \"To\" empty to apply from the start date onward.")}</p>

            <div className="space-y-1.5">
              <Label>{t("Change")}</Label>
              <Select name="adjust_type" value={adjustType} onChange={(e) => setAdjustType(e.target.value as "percent" | "fixed_daily")}>
                <option value="percent">{t("Percentage (+/−%)")}</option>
                <option value="fixed_daily">{t("Fixed daily price")}</option>
              </Select>
            </div>

            {adjustType === "percent" ? (
              <div className="space-y-1.5">
                <Label>{t("Percentage")}</Label>
                <Input type="number" name="percent" step="1" placeholder={t("e.g. 15 or -20")} />
                <p className="text-xs text-muted-foreground">{t("Positive raises, negative lowers. Applies to daily, weekly and monthly rates.")}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>{t("New daily price ({currency})", { currency })}</Label>
                <Input type="number" name="fixed_price" step="0.01" placeholder="70" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>{t("Label (optional)")}</Label>
              <Input name="label" placeholder={t("e.g. Summer season")} />
            </div>

            {state.error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{t(state.error)}</p>}
            <SubmitButton>{t("Add rule")}</SubmitButton>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Active & scheduled rules")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No price rules yet. Prices follow each car's normal rates.")}</p>
          ) : (
            rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.adjust_type === "percent"
                          ? r.adjust_value >= 0
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {fmtAdjust(r)}
                    </span>
                    <span className="truncate text-sm font-medium">{carName(r.vehicle_id)}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {period(r)}
                    {r.label ? ` · ${r.label}` : ""}
                  </p>
                </div>
                <form action={deletePriceRule}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600"
                    aria-label={t("Delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
