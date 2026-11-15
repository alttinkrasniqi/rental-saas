"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { formatMoney } from "@/lib/format";
import { Trash2, Power, Ticket } from "lucide-react";
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
      {/* Create */}
      <Card className="h-fit rounded-2xl">
        <div className="flex items-center gap-3 border-b border-border/60 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight">{t("New discount code")}</h3>
            <p className="text-xs text-muted-foreground">{t("Codes your customers type at checkout for a discount.")}</p>
          </div>
        </div>
        <CardContent className="pt-5">
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("Code")}</Label>
              <Input name="code" placeholder="VERA25" className="font-mono uppercase tracking-wider" autoCapitalize="characters" />
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

            {state.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{t(state.error)}</p>}
            <SubmitButton className="w-full">{t("Add code")}</SubmitButton>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="h-fit rounded-2xl">
        <div className="flex items-center justify-between border-b border-border/60 p-5">
          <h3 className="text-base font-semibold tracking-tight">{t("Your codes")}</h3>
          {codes.length > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{codes.length}</span>
          )}
        </div>
        <CardContent className="space-y-2.5 pt-5">
          {codes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Ticket className="h-6 w-6" />
              </div>
              <p className="max-w-[260px] text-sm text-muted-foreground">
                {t("No discount codes yet. Create one and share it with customers.")}
              </p>
            </div>
          ) : (
            codes.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3.5 transition-colors hover:border-border hover:bg-muted/40 ${
                  c.active ? "" : "opacity-60"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex shrink-0 items-center rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-[13px] font-bold tracking-wider text-white">
                    {c.code}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{discountText(c)}</span>
                      {!c.active && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{t("Off")}</span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{conditions(c)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <form action={togglePromoCode}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={String(c.active)} />
                    <button
                      type="submit"
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        c.active ? "text-emerald-600 hover:bg-emerald-50" : "text-muted-foreground hover:bg-muted"
                      }`}
                      aria-label={t("Turn on/off")}
                      title={c.active ? t("Turn off") : t("Turn on")}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  </form>
                  <form action={deletePromoCode}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                      aria-label={t("Delete")}
                    >
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
