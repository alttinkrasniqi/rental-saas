import Link from "next/link";
import { isWithinInterval } from "date-fns";
import {
  Wallet, Receipt, AlertTriangle, CarFront, Activity, CheckCircle2, Clock, TrendingUp,
  Trophy, Users, CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent } from "@/components/ui/card";
import { resolveRange, type RangePreset } from "@/lib/date-range";
import { formatMoney, rentalDays, toDate, remainingCents, effectiveStatus } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const t = getT();
  const business = await getBusiness();
  const currency = business?.currency ?? "EUR";
  const supabase = createClient();

  const range = resolveRange(
    (searchParams.range as RangePreset) || "this_month",
    searchParams.from,
    searchParams.to
  );
  const itv = { start: range.start, end: range.end };

  const { data } = await supabase
    .from("rentals")
    .select("*, vehicle:vehicles(id, make, model, plate), client:clients(id, full_name)");
  const all = (data ?? []) as any[];

  // Activity metrics are by rental pickup date (rentals that happened in the period).
  const inPeriod = all.filter((r) => isWithinInterval(toDate(r.pickup_at), itv));
  const counted = inPeriod.filter((r) => r.status !== "CANCELLED");

  // Revenue is CASH-BASIS: money counted on the day it was actually received
  // (payments.paid_at), exactly like the dashboard. So a payment taken this
  // month for last month's rental counts in THIS month — no more mismatch.
  const { data: payData } = await supabase
    .from("payments")
    .select("amount_cents, paid_at, rental:rentals(vehicle:vehicles(id, make, model, plate), client:clients(id, full_name))");
  const payments = ((payData ?? []) as any[]).filter((p) => isWithinInterval(toDate(p.paid_at), itv));

  const revenue = payments.reduce((s, p) => s + (p.amount_cents ?? 0), 0);
  const billed = counted.reduce((s, r) => s + (r.total_cents ?? 0), 0);
  const outstanding = counted.reduce((s, r) => s + remainingCents(r), 0);
  const totalDays = counted.reduce((s, r) => s + rentalDays(r.pickup_at, r.return_at), 0);
  const avgDuration = counted.length ? Math.round((totalDays / counted.length) * 10) / 10 : 0;
  const avgRevenue = counted.length ? Math.round(revenue / counted.length) : 0;

  const statusCount = (s: string) => inPeriod.filter((r) => effectiveStatus(r) === s).length;

  // Top cars — by revenue received in the period (cash-basis).
  const carMap = new Map<string, { name: string; plate: string; revenue: number; count: number }>();
  for (const p of payments) {
    const v = p.rental?.vehicle;
    if (!v) continue;
    const cur = carMap.get(v.id) ?? { name: `${v.make} ${v.model}`, plate: v.plate, revenue: 0, count: 0 };
    cur.revenue += p.amount_cents ?? 0;
    cur.count += 1;
    carMap.set(v.id, cur);
  }
  const topCars = [...carMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  const maxCarRev = Math.max(1, ...topCars.map((c) => c.revenue));

  // Top clients — by amount paid in the period (cash-basis).
  const clientMap = new Map<string, { name: string; spent: number; count: number }>();
  for (const p of payments) {
    const c = p.rental?.client;
    if (!c) continue;
    const cur = clientMap.get(c.id) ?? { name: c.full_name, spent: 0, count: 0 };
    cur.spent += p.amount_cents ?? 0;
    cur.count += 1;
    clientMap.set(c.id, cur);
  }
  const topClients = [...clientMap.values()].sort((a, b) => b.spent - a.spent).slice(0, 6);

  const avatarTones = [
    "bg-primary/10 text-primary",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-violet-100 text-violet-700",
    "bg-rose-100 text-rose-700",
  ];
  const rankTones = ["bg-primary text-white", "bg-slate-800 text-white", "bg-amber-500 text-white"];

  return (
    <div className="space-y-5">
      {/* Headline KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Revenue — hero */}
        <Card className="relative overflow-hidden rounded-2xl border-transparent bg-primary p-5 text-primary-foreground shadow-sm">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-primary-foreground/85">{t("Revenue collected")}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-[26px] font-extrabold leading-none tracking-tight">{formatMoney(revenue, currency)}</p>
            <p className="mt-2 text-[11.5px] text-primary-foreground/80">
              {t("Billed")} {formatMoney(billed, currency)}
            </p>
          </div>
        </Card>

        <Stat icon={Receipt} tone="blue" label={t("Billed")} value={formatMoney(billed, currency)} />
        <Stat
          icon={AlertTriangle}
          tone={outstanding > 0 ? "rose" : "emerald"}
          label={t("Outstanding")}
          value={formatMoney(outstanding, currency)}
          emphasize={outstanding > 0}
        />
        <Stat icon={CarFront} tone="violet" label={t("Rentals")} value={String(inPeriod.length)} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Activity} tone="blue" label={t("Active")} value={String(statusCount("ACTIVE"))} />
        <Stat icon={CheckCircle2} tone="emerald" label={t("Completed")} value={String(statusCount("COMPLETED"))} />
        <Stat icon={Clock} tone="amber" label={t("Avg. duration")} value={t("{n} days", { n: avgDuration })} />
        <Stat icon={TrendingUp} tone="primary" label={t("Avg. per rental")} value={formatMoney(avgRevenue, currency)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top cars */}
        <Card className="h-fit rounded-2xl">
          <div className="flex items-center gap-3 border-b border-border/60 p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Trophy className="h-5 w-5" />
            </span>
            <h3 className="text-base font-semibold tracking-tight">{t("Top cars by revenue")}</h3>
          </div>
          <CardContent className="space-y-4 pt-5">
            {topCars.length === 0 ? (
              <Empty icon={CarFront} text={t("No rentals in this period.")} />
            ) : (
              topCars.map((c, i) => (
                <div key={i}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold", rankTones[i] ?? "bg-muted text-muted-foreground")}>
                        {i + 1}
                      </span>
                      <span className="truncate font-semibold">{c.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{c.plate}</span>
                    </span>
                    <span className="shrink-0 font-bold text-foreground">{formatMoney(c.revenue, currency)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-rose-400 transition-all"
                      style={{ width: `${Math.max(6, (c.revenue / maxCarRev) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(c.count === 1 ? "{n} payment" : "{n} payments", { n: c.count })}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top clients */}
        <Card className="h-fit rounded-2xl">
          <div className="flex items-center gap-3 border-b border-border/60 p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Users className="h-5 w-5" />
            </span>
            <h3 className="text-base font-semibold tracking-tight">{t("Top clients")}</h3>
          </div>
          <CardContent className="space-y-2 pt-5">
            {topClients.length === 0 ? (
              <Empty icon={Users} text={t("No clients in this period.")} />
            ) : (
              topClients.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3 text-sm transition-colors hover:border-border hover:bg-muted/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold", avatarTones[i % avatarTones.length])}>
                      {initials(c.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t(c.count === 1 ? "{n} payment" : "{n} payments", { n: c.count })}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
                    {formatMoney(c.spent, currency)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Link
        href="/calendar"
        className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card p-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
      >
        <CalendarDays className="h-4 w-4" />
        {t("Need the day-by-day view?")} <span className="font-semibold text-primary">{t("Open the calendar")}</span>
      </Link>
    </div>
  );
}

const STAT_TONES: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  blue: "bg-blue-100 text-blue-600",
  emerald: "bg-emerald-100 text-emerald-600",
  amber: "bg-amber-100 text-amber-600",
  violet: "bg-violet-100 text-violet-600",
  rose: "bg-rose-100 text-rose-600",
};

function Stat({
  icon: Icon,
  label,
  value,
  tone,
  emphasize,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: keyof typeof STAT_TONES;
  emphasize?: boolean;
}) {
  return (
    <Card className="rounded-2xl p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", STAT_TONES[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn("mt-3 text-[22px] font-extrabold leading-none tracking-tight", emphasize ? "text-rose-600" : "text-foreground")}>
        {value}
      </p>
    </Card>
  );
}

function Empty({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <p className="max-w-[240px] text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
