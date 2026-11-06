"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import {
  Search,
  SlidersHorizontal,
  X,
  Globe,
  Store,
  Phone,
  LayoutGrid,
  List as ListIcon,
  Eye,
  RotateCcw,
  FileText,
  Receipt,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { RentalStatusBadge, PaymentStatusBadge } from "@/components/status-badges";
import { formatMoney, formatDate, remainingCents, effectiveStatus } from "@/lib/format";
import { DateField } from "@/components/date-field";
import { markReturned } from "./actions";
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

const dotCls = (eff: string, overdue: boolean) =>
  overdue ? "bg-rose-500" : eff === "ACTIVE" ? "bg-blue-500" : eff === "RESERVED" ? "bg-amber-400" : "bg-slate-300";

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
  const router = useRouter();
  const [filter, setFilter] = useState<FilterValue>(initialFilter ?? "ALL");
  const [query, setQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(!!initialCar);
  const [carId, setCarId] = useState(initialCar ?? "");
  const [pay, setPay] = useState<PayFilter>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [view, setView] = useState<"grid" | "list">("list");
  const [selected, setSelected] = useState<any | null>(null);
  const [shown, setShown] = useState(false);
  const [pending, startTransition] = useTransition();
  const now = Date.now();

  useEffect(() => {
    try {
      const v = localStorage.getItem("rentalsView");
      if (v === "grid" || v === "list") setView(v);
    } catch {}
  }, []);
  const changeView = (v: "grid" | "list") => {
    setView(v);
    try { localStorage.setItem("rentalsView", v); } catch {}
  };

  const openRental = (r: any) => { setSelected(r); requestAnimationFrame(() => setShown(true)); };
  const closeRental = () => { setShown(false); setTimeout(() => setSelected(null), 200); };

  const isOverdue = (r: any) =>
    effectiveStatus(r) === "ACTIVE" && !r.open_ended && new Date(r.return_at).getTime() < now;

  const derive = (r: any) => {
    const eff = effectiveStatus(r);
    const overdue = isOverdue(r);
    const open = r.open_ended && eff === "ACTIVE";
    const nights = open ? null : Math.max(1, differenceInCalendarDays(new Date(r.return_at), new Date(r.pickup_at)));
    return { eff, overdue, open, nights, remaining: remainingCents(r) };
  };

  function doReturn(r: any) {
    const fd = new FormData();
    fd.set("rental_id", r.id);
    fd.set("vehicle_id", r.vehicle_id ?? "");
    startTransition(async () => {
      await markReturned(fd);
      closeRental();
      router.refresh();
    });
  }

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
        const ret = r.open_ended && effectiveStatus(r) === "ACTIVE" ? now : new Date(r.return_at).getTime();
        if (!(p <= tt && ret >= f)) return false; // overlaps the range
      }
      return true;
    });
  }, [rentals, query, carId, pay, from, to, now]);

  const counts = useMemo(() => {
    const c: Record<FilterValue, number> = { ALL: pool.length, ACTIVE: 0, OVERDUE: 0, RESERVED: 0, COMPLETED: 0, CANCELLED: 0 };
    for (const r of pool) {
      const s = effectiveStatus(r);
      if (s in c) c[s as FilterValue]++;
      if (isOverdue(r)) c.OVERDUE++;
    }
    return c;
  }, [pool]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return pool;
    if (filter === "OVERDUE") return pool.filter(isOverdue);
    return pool.filter((r) => effectiveStatus(r) === filter);
  }, [pool, filter]);

  const clearAdvanced = () => { setCarId(""); setPay("ALL"); setFrom(""); setTo(""); };

  const carName = (r: any) => (r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : t("Vehicle"));

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

      {/* Status segmented control + view toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="-mx-1 flex-1 overflow-x-auto px-1 pb-1">
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
        <div className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-input bg-card p-1 shadow-sm">
          <button type="button" onClick={() => changeView("grid")} aria-label={t("Grid")} className={cn("flex h-7 w-7 items-center justify-center rounded-md transition-colors", view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => changeView("list")} aria-label={t("List")} className={cn("flex h-7 w-7 items-center justify-center rounded-md transition-colors", view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("No rentals in this view.")}</p>
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((r) => {
            const { eff, overdue, open, nights, remaining } = derive(r);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => openRental(r)}
                className={cn(
                  "group flex flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                  overdue ? "border-l-2 border-l-rose-500 border-border" : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", dotCls(eff, overdue))} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight">{carName(r)}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.vehicle?.plate}</p>
                    </div>
                  </div>
                  <RentalStatusBadge status={eff} />
                </div>

                <div className="mt-3 min-w-0">
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

                <div className="mt-3 text-sm">
                  <p className="truncate">
                    {formatDate(r.pickup_at)} <span className="text-muted-foreground">→</span>{" "}
                    {open ? <span className="font-medium text-blue-600">{t("open")}</span> : formatDate(r.return_at)}
                  </p>
                  {nights !== null && <p className="mt-0.5 text-xs text-muted-foreground">{t("{n} days", { n: nights })}</p>}
                </div>

                <div className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-3">
                  <div>
                    <div className="text-sm font-semibold">{formatMoney(r.total_cents, currency)}</div>
                    {remaining > 0 && <div className="text-xs text-rose-600">{t("{amount} left", { amount: formatMoney(remaining, currency) })}</div>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {overdue && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">{t("Overdue")}</span>}
                    <PaymentStatusBadge paid_cents={r.paid_cents} total_cents={r.total_cents} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1.5fr)_minmax(0,1.3fr)_minmax(12rem,0.9fr)] items-center gap-4 border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
            <span>{t("Car")}</span>
            <span>{t("Client")}</span>
            <span>{t("Dates")}</span>
            <span className="text-right">{t("Status")}</span>
          </div>

          <div className="divide-y divide-border">
            {filtered.map((r) => {
              const { eff, overdue, open, nights, remaining } = derive(r);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openRental(r)}
                  className={cn(
                    "grid w-full grid-cols-1 gap-3 p-4 text-left transition-colors hover:bg-muted/60 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1.5fr)_minmax(0,1.3fr)_minmax(12rem,0.9fr)] sm:items-center sm:gap-4",
                    overdue && "border-l-2 border-rose-500"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", dotCls(eff, overdue))} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight">{carName(r)}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.vehicle?.plate}</p>
                    </div>
                  </div>

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

                  <div className="min-w-0 text-sm">
                    <p className="truncate">
                      {formatDate(r.pickup_at)} <span className="text-muted-foreground">→</span>{" "}
                      {open ? <span className="font-medium text-blue-600">{t("open")}</span> : formatDate(r.return_at)}
                    </p>
                    {nights !== null && <p className="mt-0.5 text-xs text-muted-foreground">{t("{n} days", { n: nights })}</p>}
                  </div>

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
                      <RentalStatusBadge status={eff} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Rental quick-view drawer */}
      {selected && (() => {
        const r = selected;
        const { eff, overdue, open, nights } = derive(r);
        return (
          <>
            <div onClick={closeRental} className={cn("fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300", shown ? "opacity-100" : "opacity-0")} />
            <aside className={cn(
              "fixed inset-y-2 right-2 z-50 flex w-[calc(100%-1rem)] max-w-md transform flex-col overflow-hidden rounded-3xl bg-card shadow-2xl ring-1 ring-black/5 transition-transform duration-300 ease-out sm:inset-y-4 sm:right-4",
              shown ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]"
            )}>
              {/* header */}
              <div className="relative shrink-0 bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground">
                <button type="button" onClick={closeRental} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30">
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2 pr-8">
                  <span className={cn("h-2.5 w-2.5 rounded-full ring-2 ring-white/60", dotCls(eff, overdue))} />
                  <h2 className="truncate text-xl font-bold leading-tight">{carName(r)}</h2>
                </div>
                <p className="mt-0.5 text-sm text-white/80">{r.vehicle?.plate}</p>
                <div className="mt-3 flex items-center gap-2">
                  <RentalStatusBadge status={eff} />
                  {overdue && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">{t("Overdue")}</span>}
                </div>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto p-4">
                {/* client */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold">{r.client?.full_name ?? t("Client")}</p>
                    <SourceChip source={r.source} t={t} />
                  </div>
                  {r.client?.phone && (
                    <a href={`tel:${r.client.phone}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                      <Phone className="h-3.5 w-3.5" /> {r.client.phone}
                    </a>
                  )}
                </div>

                {/* dates */}
                <div className="rounded-xl border border-border p-3">
                  <p className="text-sm">
                    {formatDate(r.pickup_at)} <span className="text-muted-foreground">→</span>{" "}
                    {open ? <span className="font-medium text-blue-600">{t("open")}</span> : formatDate(r.return_at)}
                  </p>
                  {nights !== null && <p className="mt-0.5 text-xs text-muted-foreground">{t("{n} days", { n: nights })}</p>}
                </div>

                {/* financials */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">{t("Total")}</p>
                    <p className="mt-0.5 font-bold">{formatMoney(r.total_cents, currency)}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">{t("Paid")}</p>
                    <p className="mt-0.5 font-bold text-emerald-600">{formatMoney(r.paid_cents, currency)}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">{t("Remaining")}</p>
                    <p className={cn("mt-0.5 font-bold", remainingCents(r) > 0 ? "text-rose-600" : "text-muted-foreground")}>{formatMoney(remainingCents(r), currency)}</p>
                  </div>
                </div>
              </div>

              {/* actions */}
              <div className="shrink-0 space-y-2 border-t border-border p-4">
                <Link href={`/rentals/${r.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                  <Eye className="h-4 w-4" /> {t("View rental")}
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  {eff === "ACTIVE" && (
                    <button type="button" disabled={pending} onClick={() => doReturn(r)} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-input bg-card text-sm font-medium hover:bg-muted disabled:opacity-60">
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} {t("Mark returned")}
                    </button>
                  )}
                  <Link href={`/rentals/${r.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-input bg-card text-sm font-medium hover:bg-muted">
                    {t("Record payment")}
                  </Link>
                  <Link href={`/contract/${r.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-input bg-card text-sm font-medium hover:bg-muted">
                    <FileText className="h-4 w-4" /> {t("Kontrata")}
                  </Link>
                  <Link href={`/invoice/${r.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-input bg-card text-sm font-medium hover:bg-muted">
                    <Receipt className="h-4 w-4" /> {t("Fatura")}
                  </Link>
                </div>
              </div>
            </aside>
          </>
        );
      })()}
    </div>
  );
}
