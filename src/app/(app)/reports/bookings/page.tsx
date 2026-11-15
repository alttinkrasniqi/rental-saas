import {
  isWithinInterval, differenceInCalendarDays, eachDayOfInterval, eachMonthOfInterval,
  isSameDay, isSameMonth, format,
} from "date-fns";
import { CalendarCheck, Clock, Wallet, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, toDate, rentalDays } from "@/lib/format";
import { resolveRange, type RangePreset } from "@/lib/date-range";
import { getT } from "@/lib/i18n/server";
import { StatTile, BarChart } from "../report-ui";

export const dynamic = "force-dynamic";

const SQ_MONTHS = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gsh", "Sht", "Tet", "Nën", "Dhj"];
// Weekday short labels, Monday-first. getDay(): 0=Sun..6=Sat.
const SQ_WD = ["Hën", "Mar", "Mër", "Enj", "Pre", "Sht", "Die"];
const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function BookingsReportPage({
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

  const { data: rData } = await supabase
    .from("rentals")
    .select("id, pickup_at, return_at, total_cents, source, open_ended, status")
    .neq("status", "CANCELLED");

  const rentals = (rData ?? []) as any[];
  const counted = rentals.filter((r) => isWithinInterval(toDate(r.pickup_at), itv));

  const total = counted.length;
  const closed = counted.filter((r) => !r.open_ended);
  const avgDuration = closed.length
    ? Math.round((closed.reduce((s, r) => s + rentalDays(r.pickup_at, r.return_at), 0) / closed.length) * 10) / 10
    : 0;
  const avgValue = total ? Math.round(counted.reduce((s, r) => s + (r.total_cents ?? 0), 0) / total) : 0;
  const onlineCount = counted.filter((r) => r.source === "online").length;
  const onlinePct = total ? Math.round((onlineCount / total) * 100) : 0;

  // Volume over time.
  const short = daysInPeriod <= 31;
  const buckets = short
    ? eachDayOfInterval({ start: range.start, end: range.end }).map((d) => ({
        label: format(d, "d"),
        value: counted.filter((r) => isSameDay(toDate(r.pickup_at), d)).length,
        caption: undefined as string | undefined,
      }))
    : eachMonthOfInterval({ start: range.start, end: range.end }).map((d) => ({
        label: SQ_MONTHS[d.getMonth()],
        value: counted.filter((r) => isSameMonth(toDate(r.pickup_at), d)).length,
        caption: undefined as string | undefined,
      }));

  // Busiest weekdays.
  const wdCounts = WD_ORDER.map((dow, i) => ({
    label: SQ_WD[i],
    value: counted.filter((r) => toDate(r.pickup_at).getDay() === dow).length,
    caption: undefined as string | undefined,
  }));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={CalendarCheck} tone="bg-primary/10 text-primary" label={t("Bookings")} value={String(total)} />
        <StatTile icon={Clock} tone="bg-amber-100 text-amber-600" label={t("Avg. duration")} value={t("{n} days", { n: avgDuration })} />
        <StatTile icon={Wallet} tone="bg-emerald-100 text-emerald-600" label={t("Avg. value")} value={formatMoney(avgValue, currency)} />
        <StatTile icon={Globe} tone="bg-blue-100 text-blue-600" label={t("Online share")} value={`${onlinePct}%`} />
      </div>

      <Card className="rounded-2xl">
        <div className="border-b border-border/60 p-5">
          <h3 className="text-base font-semibold tracking-tight">{t("Bookings over time")}</h3>
        </div>
        <CardContent className="p-5">
          {total === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("No bookings in this period.")}</p>
          ) : (
            <BarChart data={buckets} />
          )}
        </CardContent>
      </Card>

      {total > 0 && (
        <Card className="rounded-2xl">
          <div className="border-b border-border/60 p-5">
            <h3 className="text-base font-semibold tracking-tight">{t("Busiest weekdays")}</h3>
          </div>
          <CardContent className="p-5">
            <BarChart data={wdCounts} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
