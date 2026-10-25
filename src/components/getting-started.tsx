"use client";

import Link from "next/link";
import { Check, ArrowRight, Rocket } from "lucide-react";
import { useT } from "@/lib/i18n/provider";

type Props = { details: boolean; car: boolean; website: boolean; client: boolean };

// Stays on the dashboard until all steps are complete (no manual dismiss),
// and because completion is read from account data it's consistent everywhere.
export function GettingStarted({ details, car, website, client }: Props) {
  const t = useT();

  const steps = [
    { done: details, label: t("Business details"), desc: t("Add your phone, address and email."), href: "/settings" },
    { done: car, label: t("Add your first car"), desc: t("Add a car with its daily price."), href: "/cars/new" },
    { done: website, label: t("Set up your booking page"), desc: t("Add photos and publish your page."), href: "/website" },
    { done: client, label: t("Add your first client"), desc: t("Keep your customers organized."), href: "/clients/new" },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  if (allDone) return null;

  const nextIdx = steps.findIndex((s) => !s.done);
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Rocket className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("Get started")}</h2>
          <p className="text-xs text-muted-foreground">{t("A few steps to set up your rental business.")}</p>
        </div>
      </div>

      {/* progress */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-primary/15">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-xs font-semibold text-primary">
          {t("{done} of {total} completed", { done: doneCount, total: steps.length })}
        </span>
      </div>

      {/* steps */}
      <div className="mt-4 space-y-2">
        {steps.map((s, i) => {
          const isNext = i === nextIdx;
          return (
            <div
              key={i}
              className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                s.done ? "border-border bg-white/60" : isNext ? "border-primary/30 bg-white" : "border-border bg-white/40"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    s.done ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"
                  }`}
                >
                  {s.done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p className={`truncate text-sm font-medium ${s.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {s.label}
                  </p>
                  {!s.done && <p className="truncate text-xs text-muted-foreground">{s.desc}</p>}
                </div>
              </div>
              {!s.done && (
                <Link
                  href={s.href}
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-semibold ${
                    isNext
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-input bg-white text-foreground hover:bg-muted"
                  }`}
                >
                  {t("Continue")} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
