import Link from "next/link";
import { isWithinInterval } from "date-fns";
import { Wallet, Receipt, PiggyBank, Percent } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, toDate } from "@/lib/format";
import { resolveRange, type RangePreset } from "@/lib/date-range";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
import type { Vehicle } from "@/lib/types";
import { StatTile } from "../report-ui";

export const dynamic = "force-dynamic";

export default async function PnlReportPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const t = getT();
  const business = await getBusiness();
  const currency = business?.currency ?? "EUR";
  const supabase = createClient();

  const range = resolveRange((searchParams.range as RangePreset) || "this_month", searchParams.from, searchParams.to);
  const itv = { start: range.start, end: range.end };

  const [{ data: vData }, { data: payData }, { data: expData }] = await Promise.all([
    supabase.from("vehicles").select("id, make, model, plate, archived").order("make", { ascending: true }),
    supabase.from("payments").select("amount_cents, paid_at, rental:rentals(vehicle_id)"),
    supabase.from("expenses").select("amount_cents, expense_date, vehicle_id"),
  ]);

  const vehicles = (vData ?? []).filter((v: any) => !v.archived) as Vehicle[];
  const payments = ((payData ?? []) as any[]).filter((p) => isWithinInterval(toDate(p.paid_at), itv));
  const expenses = ((expData ?? []) as any[]).filter((e) => e.expense_date && isWithinInterval(toDate(e.expense_date), itv));

  // Revenue per vehicle (cash-basis). Costs per vehicle from tied expenses.
  const rev = new Map<string, number>();
  for (const p of payments) {
    const vid = p.rental?.vehicle_id;
    if (vid) rev.set(vid, (rev.get(vid) ?? 0) + (p.amount_cents ?? 0));
  }
  const cost = new Map<string, number>();
  let generalCost = 0;
  for (const e of expenses) {
    if (e.vehicle_id) cost.set(e.vehicle_id, (cost.get(e.vehicle_id) ?? 0) + (e.amount_cents ?? 0));
    else generalCost += e.amount_cents ?? 0;
  }

  const rows = vehicles
    .map((v: any) => {
      const r = rev.get(v.id) ?? 0;
      const c = cost.get(v.id) ?? 0;
      const profit = r - c;
      const margin = r > 0 ? Math.round((profit / r) * 100) : null;
      return { v, r, c, profit, margin };
    })
    // Only show cars that had any revenue or cost in the period.
    .filter((x) => x.r !== 0 || x.c !== 0)
    .sort((a, b) => b.profit - a.profit);

  const totalRev = rows.reduce((s, x) => s + x.r, 0);
  const totalCarCost = rows.reduce((s, x) => s + x.c, 0);
  const totalCost = totalCarCost + generalCost;
  const netProfit = totalRev - totalCost;
  const netMargin = totalRev > 0 ? Math.round((netProfit / totalRev) * 100) : null;

  const maxAbs = Math.max(1, ...rows.map((x) => Math.abs(x.profit)));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Wallet} tone="bg-emerald-100 text-emerald-600" label={t("Revenue")} value={formatMoney(totalRev, currency)} />
        <StatTile icon={Receipt} tone="bg-rose-100 text-rose-600" label={t("Costs")} value={formatMoney(totalCost, currency)} />
        <StatTile
          icon={PiggyBank}
          tone={netProfit >= 0 ? "bg-primary/10 text-primary" : "bg-rose-100 text-rose-600"}
          label={t("Net profit")}
          value={formatMoney(netProfit, currency)}
          valueCls={netProfit >= 0 ? "text-primary" : "text-rose-600"}
        />
        <StatTile icon={Percent} tone="bg-violet-100 text-violet-600" label={t("Margin")} value={netMargin != null ? `${netMargin}%` : "—"} />
      </div>

      {generalCost > 0 && (
        <Card className="rounded-2xl">
          <CardContent className="flex items-center justify-between gap-3 p-4 text-sm">
            <span className="text-muted-foreground">{t("General costs (not tied to a car)")}</span>
            <span className="font-semibold text-rose-600">−{formatMoney(generalCost, currency)}</span>
          </CardContent>
        </Card>
      )}

      {/* Per-car P&L */}
      <Card className="rounded-2xl">
        <div className="border-b border-border/60 p-5">
          <h3 className="text-base font-semibold tracking-tight">{t("Profit by car")}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("Revenue collected minus expenses tied to each car, this period.")}</p>
        </div>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">{t("No revenue or costs in this period.")}</p>
          ) : (
            <div className="divide-y divide-border/60">
              {rows.map(({ v, r, c, profit, margin }) => (
                <Link
                  key={v.id}
                  href={`/cars/${v.id}`}
                  className="block px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{v.make} {v.model}{v.plate ? <span className="ml-1 font-mono text-[11px] text-muted-foreground">{v.plate}</span> : null}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("Revenue")}: {formatMoney(r, currency)} · {t("Costs")}: {formatMoney(c, currency)}
                        {margin != null ? ` · ${margin}%` : ""}
                      </p>
                    </div>
                    <span className={cn("shrink-0 text-sm font-bold", profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {profit >= 0 ? "+" : "−"}{formatMoney(Math.abs(profit), currency)}
                    </span>
                  </div>
                  {/* profit bar */}
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", profit >= 0 ? "bg-emerald-500" : "bg-rose-500")}
                      style={{ width: `${Math.max(3, (Math.abs(profit) / maxAbs) * 100)}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="px-1 text-xs text-muted-foreground">
        {t("Tip: tag expenses to a car (fuel, service, parts) so its profit is accurate.")}
      </p>
    </>
  );
}
