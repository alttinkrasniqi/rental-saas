"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RentalStatusBadge, PaymentStatusBadge } from "@/components/status-badges";
import { formatMoney, formatDate, remainingCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RentalStatus } from "@/lib/types";
import { useT } from "@/lib/i18n/provider";

type FilterValue = RentalStatus | "ALL" | "OVERDUE";
type PayFilter = "ALL" | "PAID" | "PARTIAL" | "UNPAID";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "RESERVED", label: "Reserved" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function payBucket(r: any): PayFilter {
  const total = r.total_cents ?? 0;
  const paid = r.paid_cents ?? 0;
  if (paid <= 0) return "UNPAID";
  if (total > 0 && paid >= total) return "PAID";
  return "PARTIAL";
}

export function RentalsList({
  rentals,
  currency,
  initialFilter,
}: {
  rentals: any[];
  currency: string;
  initialFilter?: FilterValue;
}) {
  const t = useT();
  const [filter, setFilter] = useState<FilterValue>(initialFilter ?? "ALL");
  const [query, setQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [carId, setCarId] = useState("");
  const [pay, setPay] = useState<PayFilter>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const now = Date.now();

  const isOverdue = (r: any) =>
    r.status === "ACTIVE" && !r.open_ended && new Date(r.return_at).getTime() < now;

  // Unique cars present in these rentals, for the car dropdown.
  const cars = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rentals) {
      if (r.vehicle_id && r.vehicle && !m.has(r.vehicle_id)) {
        m.set(r.vehicle_id, `${r.vehicle.make} ${r.vehicle.model}${r.vehicle.plate ? ` · ${r.vehicle.plate}` : ""}`);
      }
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rentals]);

  const activeAdvanced = (carId ? 1 : 0) + (pay !== "ALL" ? 1 : 0) + (from || to ? 1 : 0);

  // search → advanced (car / payment / date range) → pool
  const pool = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const tt = to ? new Date(`${to}T23:59:59`).getTime() : Infinity;
    return rentals.filter((r) => {
      if (q) {
        const hay = [r.vehicle?.make, r.vehicle?.model, r.vehicle?.plate, r.client?.full_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (carId && r.vehicle_id !== carId) return false;
      if (pay !== "ALL" && payBucket(r) !== pay) return false;
      if (from || to) {
        const p = new Date(r.pickup_at).getTime();
        const ret = r.open_ended && r.status === "ACTIVE" ? now : new Date(r.return_at).getTime();
        if (!(p <= tt && ret >= f)) return false; // overlaps the range
      }
      return true;
    });
  }, [rentals, query, carId, pay, from, to, now]);

  const counts = useMemo(() => {
    const c: Record<FilterValue, number> = { ALL: pool.length, ACTIVE: 0, OVERDUE: 0, RESERVED: 0, COMPLETED: 0, CANCELLED: 0 };
    for (const r of pool) {
      if (r.status in c) c[r.status as FilterValue]++;
      if (isOverdue(r)) c.OVERDUE++;
    }
    return c;
  }, [pool]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return pool;
    if (filter === "OVERDUE") return pool.filter(isOverdue);
    return pool.filter((r) => r.status === filter);
  }, [pool, filter]);

  const clearAdvanced = () => { setCarId(""); setPay("ALL"); setFrom(""); setTo(""); };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search by car, plate or client…")}
            className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
            panelOpen || activeAdvanced > 0 ? "border-primary bg-primary/10 text-primary" : "border-input bg-card hover:bg-muted"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t("Filters")}
          {activeAdvanced > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{activeAdvanced}</span>
          )}
        </button>
      </div>

      {panelOpen && (
        <Card className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("Car")}</label>
            <select value={carId} onChange={(e) => setCarId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm outline-none focus:border-primary">
              <option value="">{t("All cars")}</option>
              {cars.map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("Payment")}</label>
            <select value={pay} onChange={(e) => setPay(e.target.value as PayFilter)} className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm outline-none focus:border-primary">
              <option value="ALL">{t("All")}</option>
              <option value="PAID">{t("Paid")}</option>
              <option value="PARTIAL">{t("Partially paid")}</option>
              <option value="UNPAID">{t("Unpaid")}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("From")}</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm outline-none focus:border-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("To")}</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm outline-none focus:border-primary" />
          </div>
          {activeAdvanced > 0 && (
            <div className="sm:col-span-2 lg:col-span-4">
              <button type="button" onClick={clearAdvanced} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" /> {t("Clear all")}
              </button>
            </div>
          )}
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "h-9 rounded-md border px-3 text-sm font-medium transition-colors",
              filter === f.value ? "border-primary bg-primary/10 text-primary" : "border-input bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {t(f.label)}{" "}
            <span className={cn("ml-0.5", f.value === "OVERDUE" && counts.OVERDUE > 0 && filter !== f.value && "text-rose-600")}>
              ({counts[f.value]})
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("No rentals in this view.")}</p>
      ) : (
        <Card className="divide-y divide-border">
          {filtered.map((r) => {
            const overdue = isOverdue(r);
            const remaining = remainingCents(r);
            return (
              <Link
                key={r.id}
                href={`/rentals/${r.id}`}
                className={cn(
                  "flex flex-col gap-2 p-4 hover:bg-muted sm:flex-row sm:items-center sm:justify-between",
                  overdue && "border-l-2 border-rose-500"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : t("Vehicle")}{" "}
                    <span className="text-muted-foreground">{r.vehicle?.plate}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {r.client?.full_name ?? t("Client")} · {formatDate(r.pickup_at)} →{" "}
                    {r.open_ended && r.status === "ACTIVE" ? t("open") : formatDate(r.return_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-sm font-semibold">{formatMoney(r.total_cents, currency)}</div>
                    {remaining > 0 && (
                      <div className="text-xs text-rose-600">{t("{amount} left", { amount: formatMoney(remaining, currency) })}</div>
                    )}
                  </div>
                  {overdue && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">{t("Overdue")}</span>
                  )}
                  <PaymentStatusBadge paid_cents={r.paid_cents} total_cents={r.total_cents} />
                  <RentalStatusBadge status={r.status} />
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
