"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ArrowRight, X, Rocket } from "lucide-react";
import { useT } from "@/lib/i18n/provider";

type Props = { details: boolean; car: boolean; website: boolean; client: boolean };

const DISMISS_KEY = "mr_gs_dismissed";

export function GettingStarted({ details, car, website, client }: Props) {
  const t = useT();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") setHidden(true);
    } catch {}
  }, []);

  const steps = [
    { done: details, label: t("Business details"), desc: t("Add your phone, address and email."), href: "/settings" },
    { done: car, label: t("Add your first car"), desc: t("Add a car with its daily price."), href: "/cars/new" },
    { done: website, label: t("Set up your booking page"), desc: t("Add photos and publish your page."), href: "/website" },
    { done: client, label: t("Add your first client"), desc: t("Keep your customers organized."), href: "/clients/new" },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  if (hidden || allDone) return null;

  const nextIdx = steps.findIndex((s) => !s.done);
  const pct = Math.round((doneCount / steps.length) * 100);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setHidden(true);
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Rocket className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("Get started")}</h2>
            <p className="text-xs text-muted-foreground">{t("A few steps to set up your rental business.")}</p>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Mbyll" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
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
