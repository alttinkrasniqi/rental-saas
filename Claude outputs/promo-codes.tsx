"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { formatMoney } from "@/lib/format";
import { Trash2, Power } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { createPromoCode, deletePromoCode, togglePromoCode, type PromoState } from "./promo-actions";

export interface PromoCode {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_total_cents: number | null;
  valid_from: string | null;
  valid_to: string | null;
  max_uses: number | null;
  used_count: number;
  active: boolean;
}

export function PromoCodes({ codes, currency }: { codes: PromoCode[]; currency: string }) {
  const t = useT();
  const [state, formAction] = useFormState(createPromoCode, {} as PromoState);
  const [type, setType] = useState<"percent" | "fixed">("percent");

  const discountText = (c: PromoCode) =>
    c.discount_type === "percent" ? `−${c.discount_value}%` : `−${formatMoney(c.discount_value, currency)}`;

  const conditions = (c: PromoCode) => {
    const parts: string[] = [];
    if (c.valid_from || c.valid_to) parts.push(`${c.valid_from || "…"} → ${c.valid_to || t("onward")}`);
    if (c.min_total_cents) parts.push(t("min {v}", { v: formatMoney(c.min_total_cents, currency) }));
    parts.push(c.max_uses ? t("{a}/{b} used", { a: c.used_count, b: c.max_uses }) : t("{a} used", { a: c.used_count }));
    return parts.join(" · ");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Create */}
      <Card>
        <CardHeader>
          <CardTitle>{t("New discount code")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("Code")}</Label>
              <Input name="code" placeholder="VERA25" className="uppercase" autoCapitalize="characters" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("Discount")}</Label>
                <Select name="discount_type" value={type} onChange={(e) => setType(e.target.value as "percent" | "fixed")}>
                  <option value="percent">{t("Percentage (%)")}</option>
                  <option value="fixed">{t("Fixed amount")}</option>
                </Select>
              </div>
              {type === "percent" ? (
                <div className="space-y-1.5">
                  <Label>{t("Percentage")}</Label>
                  <Input type="number" name="percent" step="1" min="1" max="100" placeholder="25" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>{t("Amount ({currency})", { currency })}</Label>
                  <Input type="number" name="amount" step="0.01" placeholder="10" />
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("Valid from (optional)")}</Label>
                <Input type="date" name="valid_from" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Valid to (optional)")}</Label>
                <Input type="date" name="valid_to" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("Min. total ({currency})", { currency })}</Label>
                <Input type="number" name="min_total" step="0.01" placeholder={t("optional")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Max uses")}</Label>
                <Input type="number" name="max_uses" step="1" min="1" placeholder={t("optional")} />
              </div>
            </div>

            {state.error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{t(state.error)}</p>}
            <SubmitButton>{t("Add code")}</SubmitButton>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Your codes")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {codes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No discount codes yet. Create one and share it with customers.")}</p>
          ) : (
            codes.map((c) => (
              <div key={c.id} className={`flex items-center justify-between gap-3 rounded-lg border border-border p-3 ${c.active ? "" : "opacity-60"}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[12px] font-bold text-white">{c.code}</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{discountText(c)}</span>
                    {!c.active && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{t("Off")}</span>}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{conditions(c)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <form action={togglePromoCode}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={String(c.active)} />
                    <button type="submit" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" aria-label={t("Turn on/off")} title={c.active ? t("Turn off") : t("Turn on")}>
                      <Power className="h-4 w-4" />
                    </button>
                  </form>
                  <form action={deletePromoCode}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600" aria-label={t("Delete")}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
