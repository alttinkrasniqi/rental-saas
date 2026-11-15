import {
  isWithinInterval, differenceInCalendarDays, eachDayOfInterval, eachMonthOfInterval,
  isSameDay, isSameMonth, format,
} from "date-fns";
import { Wallet, Receipt, AlertTriangle, CalendarDays, Globe, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, toDate, remainingCents } from "@/lib/format";
import { resolveRange, type RangePreset } from "@/lib/date-range";
import { getT } from "@/lib/i18n/server";
import { StatTile, BarChart } from "../report-ui";

export const dynamic = "force-dynamic";

const SQ_MONTHS = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gsh", "Sht", "Tet", "Nën", "Dhj"];

export default async function RevenueReportPage({
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
  const daysInPeriod = Math.max(1, differenceInCalendarDays(range.end, range.start) + 1);

  const [{ data: rData }, { data: payData }] = await Promise.all([
    supabase.from("rentals").select("id, pickup_at, total_cents, paid_cents, status, open_ended, return_at").neq("status", "CANCELLED"),
    supabase.from("payments").select("amount_cents, paid_at, rental:rentals(source)"),
  ]);

  const rentals = (rData ?? []) as any[];
  const counted = rentals.filter((r) => isWithinInterval(toDate(r.pickup_at), itv));
  const payments = ((payData ?? []) as any[]).filter((p) => isWithinInterval(toDate(p.paid_at), itv));

  const collected = payments.reduce((s, p) => s + (p.amount_cents ?? 0), 0);
  const billed = counted.reduce((s, r) => s + (r.total_cents ?? 0), 0);
  const outstanding = counted.reduce((s, r) => s + remainingCents(r), 0);
  const perDay = Math.round(collected / daysInPeriod);

  const onlineCollected = payments.filter((p) => p.rental?.source === "online").reduce((s, p) => s + (p.amount_cents ?? 0), 0);
  const walkinCollected = collected - onlineCollected;
  const onlinePct = collected > 0 ? Math.round((onlineCollected / collected) * 100) : 0;

  // Adaptive buckets: daily for short periods, monthly for long ones.
  const short = daysInPeriod <= 31;
  const buckets = short
    ? eachDayOfInterval({ start: range.start, end: range.end }).map((d) => {
        const value = payments.filter((p) => isSameDay(toDate(p.paid_at), d)).reduce((s, p) => s + (p.amount_cents ?? 0), 0);
        return { label: format(d, "d"), value, caption: formatMoney(value, currency) };
      })
    : eachMonthOfInterval({ start: range.start, end: range.end }).map((d) => {
        const value = payments.filter((p) => isSameMonth(toDate(p.paid_at), d)).reduce((s, p) => s + (p.amount_cents ?? 0), 0);
        return { label: SQ_MONTHS[d.getMonth()], value, caption: formatMoney(value, currency) };
      });

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="relative overflow-hidden rounded-2xl border-transparent bg-primary p-4 text-primary-foreground shadow-sm">
          <div className="flex items-start justify-between">
            <span className="text-[13px] font-medium text-primary-foreground/85">{t("Revenue collected")}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20"><Wallet className="h-4 w-4" /></span>
          </div>
          <p className="mt-3 text-[22px] font-extrabold leading-none tracking-tight">{formatMoney(collected, currency)}</p>
        </Card>
        <StatTile icon={Receipt} tone="bg-blue-100 text-blue-600" label={t("Billed")} value={formatMoney(billed, currency)} />
        <StatTile icon={AlertTriangle} tone={outstanding > 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"} label={t("Outstanding")} value={formatMoney(outstanding, currency)} valueCls={outstanding > 0 ? "text-rose-600" : undefined} />
        <StatTile icon={CalendarDays} tone="bg-violet-100 text-violet-600" label={`${t("Revenue collected")} / ${t("days")}`} value={formatMoney(perDay, currency)} />
      </div>

      <Card className="rounded-2xl">
        <div className="border-b border-border/60 p-5">
          <h3 className="text-base font-semibold tracking-tight">{t("Collected over time")}</h3>
        </div>
        <CardContent className="p-5">
          {collected === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("No revenue in this period.")}</p>
          ) : (
            <BarChart data={buckets} />
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <div className="border-b border-border/60 p-5">
          <h3 className="text-base font-semibold tracking-tight">{t("Revenue by source")}</h3>
        </div>
        <CardContent className="space-y-3 p-5">
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            <div className="bg-blue-500" style={{ width: `${onlinePct}%` }} />
            <div className="bg-primary" style={{ width: `${100 - onlinePct}%` }} />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              {t("Online")} <b className="font-bold">{formatMoney(onlineCollected, currency)}</b>
              <span className="text-xs text-muted-foreground">({onlinePct}%)</span>
            </span>
            <span className="flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              {t("Walk-in")} <b className="font-bold">{formatMoney(walkinCollected, currency)}</b>
              <span className="text-xs text-muted-foreground">({100 - onlinePct}%)</span>
            </span>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
