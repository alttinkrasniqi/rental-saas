import Link from "next/link";
import { isWithinInterval, differenceInCalendarDays } from "date-fns";
import { Gauge, CarFront, Wallet, Trophy, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, toDate, effectiveStatus } from "@/lib/format";
import { resolveRange, type RangePreset } from "@/lib/date-range";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
import type { Vehicle } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CarsReportPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const t = getT();
  const business = await getBusiness();
  const currency = business?.currency ?? "EUR";
  const supabase = createClient();
  const now = new Date();

  const range = resolveRange((searchParams.range as RangePreset) || "this_month", searchParams.from, searchParams.to);
  const itv = { start: range.start, end: range.end };
  const daysInPeriod = Math.max(1, differenceInCalendarDays(range.end, range.start) + 1);

  const [{ data: vData }, { data: rData }, { data: payData }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("archived", false).order("make", { ascending: true }),
    supabase.from("rentals").select("id, vehicle_id, status, open_ended, pickup_at, return_at").neq("status", "CANCELLED"),
    supabase.from("payments").select("amount_cents, paid_at, rental:rentals(vehicle_id)"),
  ]);

  const vehicles = (vData ?? []) as Vehicle[];
  const rentals = (rData ?? []) as any[];
  const payments = ((payData ?? []) as any[]).filter((p) => isWithinInterval(toDate(p.paid_at), itv));

  // Effective end: an ongoing open-ended ACTIVE rental is "out" through now.
  const effEnd = (r: any) => (r.open_ended && effectiveStatus(r, now) === "ACTIVE" ? now : toDate(r.return_at));
  // Days this rental occupied the car WITHIN the period (inclusive).
  const overlapDays = (r: any) => {
    const s = Math.max(toDate(r.pickup_at).getTime(), range.start.getTime());
    const e = Math.min(effEnd(r).getTime(), range.end.getTime());
    if (e < s) return 0;
    return differenceInCalendarDays(new Date(e), new Date(s)) + 1;
  };

  // Revenue per vehicle (cash-basis: payments received in the period).
  const revByVehicle = new Map<string, number>();
  for (const p of payments) {
    const vid = p.rental?.vehicle_id;
    if (!vid) continue;
    revByVehicle.set(vid, (revByVehicle.get(vid) ?? 0) + (p.amount_cents ?? 0));
  }

  const rows = vehicles.map((v: any) => {
    const vr = rentals.filter((r) => r.vehicle_id === v.id);
    const rentedDays = vr.reduce((s, r) => s + overlapDays(r), 0);
    const revenue = revByVehicle.get(v.id) ?? 0;
    const utilization = Math.min(100, Math.round((rentedDays / daysInPeriod) * 100));
    const perDay = rentedDays > 0 ? Math.round(revenue / rentedDays) : 0;
    return { id: v.id, name: `${v.make} ${v.model}`, plate: v.plate, rentedDays, revenue, utilization, perDay };
  });
  rows.sort((a, b) => b.revenue - a.revenue);

  const totalRentedDays = rows.reduce((s, r) => s + r.rentedDays, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const avgUtil = vehicles.length ? Math.round((totalRentedDays / (vehicles.length * daysInPeriod)) * 100) : 0;
  const revPerCar = vehicles.length ? Math.round(totalRevenue / vehicles.length) : 0;
  const topCar = rows[0];
  // Lowest-utilization car that still exists — flag if clearly underused.
  const worst = [...rows].filter((r) => vehicles.length > 1).sort((a, b) => a.utilization - b.utilization)[0];
  const showInsight = worst && worst.utilization < 35;

  const rankTones = ["bg-primary text-white", "bg-slate-800 text-white", "bg-amber-500 text-white"];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="#detail" className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={Gauge} tone="bg-blue-100 text-blue-600" label={t("Average utilization")} value={`${avgUtil}%`} />
        </Link>
        <Link href="#detail" className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={CarFront} tone="bg-violet-100 text-violet-600" label={t("Rented days (period)")} value={String(totalRentedDays)} />
        </Link>
        <Link href="#detail" className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={Wallet} tone="bg-emerald-100 text-emerald-600" label={t("Revenue / car")} value={formatMoney(revPerCar, currency)} />
        </Link>
        <Link href={topCar ? `/cars/${topCar.id}` : "#detail"} className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={Trophy} tone="bg-amber-100 text-amber-600" label={t("Top car")} value={topCar?.name ?? "—"} small />
        </Link>
      </div>

      <Card id="detail" className="h-fit scroll-mt-4 rounded-2xl">
        <div className="flex items-center justify-between border-b border-border/60 p-5">
          <h3 className="text-base font-semibold tracking-tight">{t("Performance per car")}</h3>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            {t("{n} cars", { n: vehicles.length })}
          </span>
        </div>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">{t("No cars in this period.")}</p>
          ) : (
            <>
              <div
                className="grid gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                style={{ gridTemplateColumns: "1.6fr 0.8fr 1.3fr 1fr 0.7fr" }}
              >
                <span>{t("Cars")}</span>
                <span>{t("Rented days")}</span>
                <span>{t("Utilization")}</span>
                <span>{t("Revenue")}</span>
                <span className="text-right">€/{t("days")}</span>
              </div>
              {rows.map((r, i) => {
                const bar = r.utilization >= 60 ? "bg-emerald-500" : r.utilization >= 40 ? "bg-amber-500" : "bg-rose-500";
                return (
                  <Link
                    key={r.id}
                    href={`/cars/${r.id}`}
                    className="grid items-center gap-3 border-t border-border/60 px-4 py-3 transition-colors hover:bg-muted/40"
                    style={{ gridTemplateColumns: "1.6fr 0.8fr 1.3fr 1fr 0.7fr" }}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold", rankTones[i] ?? "bg-muted text-muted-foreground")}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{r.name}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">{r.plate}</p>
                      </div>
                    </div>
                    <div className="text-sm font-semibold">
                      {r.rentedDays} <span className="text-xs font-normal text-muted-foreground">{t("days")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", bar)} style={{ width: `${Math.max(3, r.utilization)}%` }} />
                      </div>
                      <span className="w-9 text-right text-xs font-semibold">{r.utilization}%</span>
                    </div>
                    <div className="text-sm font-bold">{formatMoney(r.revenue, currency)}</div>
                    <div className="text-right text-sm text-muted-foreground">{formatMoney(r.perDay, currency)}</div>
                  </Link>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>

      {showInsight && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            {t("{car} was used only {pct}% this period — consider a promo price or resting it.", { car: worst.name, pct: worst.utilization })}
          </p>
        </div>
      )}
    </>
  );
}

function StatTile({
  icon: Icon,
  tone,
  label,
  value,
  small,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <Card className="rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tone)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn("mt-3 font-extrabold leading-none tracking-tight text-foreground", small ? "truncate text-lg" : "text-[22px]")}>
        {value}
      </p>
    </Card>
  );
}
