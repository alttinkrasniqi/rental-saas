"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { Search, SlidersHorizontal, X, Globe, Store, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RentalStatusBadge, PaymentStatusBadge } from "@/components/status-badges";
import { formatMoney, formatDate, remainingCents } from "@/lib/format";
import { DateField } from "@/components/date-field";
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

function SourceChip({ source, t }: { source?: string; t: ReturnType<typeof useT> }) {
  const online = source === "online";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
        online ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"
      )}
    >
      {online ? <Globe className="h-2.5 w-2.5" /> : <Store className="h-2.5 w-2.5" />}
      {online ? t("Online") : t("By you")}
    </span>
  );
}

export function RentalsList({
  rentals,
  currency,
  initialFilter,
  initialCar,
}: {
  rentals: any[];
  currency: string;
  initialFilter?: FilterValue;
  initialCar?: string;
}) {
  const t = useT();
  const [filter, setFilter] = useState<FilterValue>(initialFilter ?? "ALL");
  const [query, setQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(!!initialCar);
  const [carId, setCarId] = useState(initialCar ?? "");
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
        const hay = [r.vehicle?.make, r.vehicle?.model, r.vehicle?.plate, r.client?.full_name, r.client?.phone]
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
            <DateField value={from} onChange={setFrom} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("To")}</label>
            <DateField value={to} onChange={setTo} />
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

      {/* Status segmented control (calendar-style) */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-input bg-card p-1 shadow-sm">
          {FILTERS.map((f) => {
            const activeChip = filter === f.value;
            const overdueHot = f.value === "OVERDUE" && counts.OVERDUE > 0 && !activeChip;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeChip ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {t(f.label)}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs font-semibold tabular-nums",
                    activeChip ? "bg-white/20 text-primary-foreground" : overdueHot ? "bg-rose-100 text-rose-700" : "bg-muted text-muted-foreground"
                  )}
                >
                  {counts[f.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("No rentals in this view.")}</p>
      ) : (
        <Card className="overflow-hidden">
          {/* Column header — desktop only */}
          <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1.5fr)_minmax(0,1.3fr)_minmax(12rem,0.9fr)] items-center gap-4 border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
            <span>{t("Car")}</span>
            <span>{t("Client")}</span>
            <span>{t("Dates")}</span>
            <span className="text-right">{t("Status")}</span>
          </div>

          <div className="divide-y divide-border">
            {filtered.map((r) => {
              const overdue = isOverdue(r);
              const remaining = remainingCents(r);
              const open = r.open_ended && r.status === "ACTIVE";
              const nights = open ? null : Math.max(1, differenceInCalendarDays(new Date(r.return_at), new Date(r.pickup_at)));
              return (
                <Link
                  key={r.id}
                  href={`/rentals/${r.id}`}
                  className={cn(
                    "grid grid-cols-1 gap-3 p-4 transition-colors hover:bg-muted/60 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1.5fr)_minmax(0,1.3fr)_minmax(12rem,0.9fr)] sm:items-center sm:gap-4",
                    overdue && "border-l-2 border-rose-500"
                  )}
                >
                  {/* Car */}
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", overdue ? "bg-rose-500" : r.status === "ACTIVE" ? "bg-blue-500" : r.status === "RESERVED" ? "bg-amber-400" : "bg-slate-300")} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight">
                        {r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : t("Vehicle")}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{r.vehicle?.plate}</p>
                    </div>
                  </div>

                  {/* Client */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{r.client?.full_name ?? t("Client")}</p>
                      <SourceChip source={r.source} t={t} />
                    </div>
                    {r.client?.phone && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {r.client.phone}
                      </p>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="min-w-0 text-sm">
                    <p className="truncate">
                      {formatDate(r.pickup_at)} <span className="text-muted-foreground">→</span>{" "}
                      {open ? <span className="font-medium text-blue-600">{t("open")}</span> : formatDate(r.return_at)}
                    </p>
                    {nights !== null && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{t("{n} days", { n: nights })}</p>
                    )}
                  </div>

                  {/* Amount + status */}
                  <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end sm:gap-1.5">
                    <div className="text-left sm:text-right">
                      <div className="text-sm font-semibold">{formatMoney(r.total_cents, currency)}</div>
                      {remaining > 0 && (
                        <div className="text-xs text-rose-600">{t("{amount} left", { amount: formatMoney(remaining, currency) })}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {overdue && (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">{t("Overdue")}</span>
                      )}
                      <PaymentStatusBadge paid_cents={r.paid_cents} total_cents={r.total_cents} />
                      <RentalStatusBadge status={r.status} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
