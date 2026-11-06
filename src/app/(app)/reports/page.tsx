import { Suspense } from "react";
import Link from "next/link";
import { isWithinInterval } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateFilter } from "@/components/date-filter";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Reports")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("How your business performed · {range}", { range: range.label })}
        </p>
      </div>

      <Suspense fallback={null}>
        <DateFilter />
      </Suspense>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label={t("Revenue collected")} value={formatMoney(revenue, currency)} />
        <Metric label={t("Billed")} value={formatMoney(billed, currency)} />
        <Metric label={t("Outstanding")} value={formatMoney(outstanding, currency)} tone={outstanding > 0 ? "rose" : undefined} />
        <Metric label={t("Rentals")} value={String(inPeriod.length)} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label={t("Active")} value={String(statusCount("ACTIVE"))} />
        <Metric label={t("Completed")} value={String(statusCount("COMPLETED"))} />
        <Metric label={t("Avg. duration")} value={t("{n} days", { n: avgDuration })} />
        <Metric label={t("Avg. per rental")} value={formatMoney(avgRevenue, currency)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("Top cars by revenue")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCars.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("No rentals in this period.")}</p>
            ) : (
              topCars.map((c, i) => (
                <div key={i}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {c.name} <span className="text-muted-foreground">{c.plate}</span>
                    </span>
                    <span className="font-semibold">{formatMoney(c.revenue, currency)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(c.revenue / maxCarRev) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(c.count === 1 ? "{n} payment" : "{n} payments", { n: c.count })}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("Top clients")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("No clients in this period.")}</p>
            ) : (
              topClients.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(c.count === 1 ? "{n} payment" : "{n} payments", { n: c.count })}
                    </p>
                  </div>
                  <span className="font-semibold">{formatMoney(c.spent, currency)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t("Need the day-by-day view?")}{" "}
        <Link href="/calendar" className="text-primary hover:underline">
          {t("Open the calendar")}
        </Link>
        .
      </p>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "rose" }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold", tone === "rose" && "text-rose-600")}>{value}</p>
    </Card>
  );
}
