"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { Target, Pencil, Check } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { setRevenueGoal, type GoalResult } from "./goal-actions";

export function GoalCard({
  target,
  earned,
  currency,
  dayOfMonth,
  daysInMonth,
}: {
  target: number;      // cents
  earned: number;      // cents collected this month
  currency: string;
  dayOfMonth: number;
  daysInMonth: number;
}) {
  const t = useT();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, action] = useFormState(setRevenueGoal, {} as GoalResult);
  const wasOk = useRef(false);

  useEffect(() => {
    if (state.ok && !wasOk.current) {
      wasOk.current = true;
      setEditing(false);
      router.refresh();
    }
    if (!state.ok) wasOk.current = false;
  }, [state.ok, router]);

  const hasTarget = target > 0;
  const pct = hasTarget ? Math.min(100, Math.round((earned / target) * 100)) : 0;
  const expected = hasTarget ? target * (dayOfMonth / daysInMonth) : 0;
  const ahead = earned >= expected;
  const paceDelta = Math.abs(Math.round(earned - expected));
  const remaining = Math.max(0, target - earned);

  const editor = (
    <form action={action} className="flex items-center gap-2">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currency === "EUR" ? "€" : ""}</span>
        <input
          type="number"
          name="target"
          step="1"
          min="0"
          defaultValue={hasTarget ? Math.round(target / 100) : ""}
          placeholder={t("e.g. 8000")}
          className="h-10 w-full rounded-md border border-input bg-card pl-7 pr-3 text-sm outline-none focus:border-primary"
          autoFocus
        />
      </div>
      <SubmitButton className="h-10">{t("Save")}</SubmitButton>
      {hasTarget && (
        <button type="button" onClick={() => setEditing(false)} className="h-10 rounded-md px-2 text-sm text-muted-foreground hover:text-foreground">
          {t("Cancel")}
        </button>
      )}
    </form>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Target className="h-4 w-4" /></span>
          <h3 className="text-sm font-semibold">{t("This month's goal")}</h3>
        </div>
        {hasTarget && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <Pencil className="h-3.5 w-3.5" /> {t("Edit")}
          </button>
        )}
      </div>

      {editing || !hasTarget ? (
        <div>
          {!hasTarget && <p className="mb-2 text-sm text-muted-foreground">{t("Set a monthly revenue goal and track your pace.")}</p>}
          {editor}
          {state.error && <p className="mt-2 text-sm text-rose-600">{state.error}</p>}
        </div>
      ) : (
        <div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-2xl font-extrabold leading-none">{formatMoney(earned, currency)}</p>
            <p className="text-sm text-muted-foreground">{t("of {v}", { v: formatMoney(target, currency) })}</p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", pct >= 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${Math.max(2, pct)}%` }} />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold", ahead ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
              {ahead ? <Check className="h-3 w-3" /> : null}
              {pct >= 100
                ? t("Goal reached! 🎉")
                : ahead
                ? t("Ahead by {v}", { v: formatMoney(paceDelta, currency) })
                : t("Behind by {v}", { v: formatMoney(paceDelta, currency) })}
            </span>
            <span className="text-muted-foreground">
              {pct >= 100 ? `${pct}%` : t("{v} to go", { v: formatMoney(remaining, currency) })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
