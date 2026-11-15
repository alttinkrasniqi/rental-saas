import Link from "next/link";
import {
  isWithinInterval, differenceInCalendarDays, eachDayOfInterval, eachMonthOfInterval,
  isSameDay, isSameMonth, format,
} from "date-fns";
import { CalendarCheck, Clock, Wallet, Globe, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, toDate, rentalDays, formatDate, effectiveStatus } from "@/lib/format";
import { resolveRange, type RangePreset } from "@/lib/date-range";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
import { StatTile, BarChart } from "../report-ui";

export const dynamic = "force-dynamic";

const SQ_MONTHS = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gsh", "Sht", "Tet", "Nën", "Dhj"];
const SQ_WD = ["Hën", "Mar", "Mër", "Enj", "Pre", "Sht", "Die"];
const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function BookingsReportPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string; f?: string };
}) {
  const t = getT();
  const business = await getBusiness();
  const currency = business?.currency ?? "EUR";
  const supabase = createClient();
  const now = new Date();

  const range = resolveRange((searchParams.range as RangePreset) || "this_month", searchParams.from, searchParams.to);
  const itv = { start: range.start, end: range.end };
  const daysInPeriod = Math.max(1, differenceInCalendarDays(range.end, range.start) + 1);

  const { data: rData } = await supabase
    .from("rentals")
    .select("id, pickup_at, return_at, total_cents, source, open_ended, status, vehicle:vehicles(make, model, plate), client:clients(full_name)")
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
      }))
    : eachMonthOfInterval({ start: range.start, end: range.end }).map((d) => ({
        label: SQ_MONTHS[d.getMonth()],
        value: counted.filter((r) => isSameMonth(toDate(r.pickup_at), d)).length,
      }));

  const wdCounts = WD_ORDER.map((dow, i) => ({
    label: SQ_WD[i],
    value: counted.filter((r) => toDate(r.pickup_at).getDay() === dow).length,
  }));

  // ---- Detailed listing (the "sheet"), with an optional subset filter driven
  // by which summary card was clicked. ----
  const f = searchParams.f === "online" ? "online" : searchParams.f === "walkin" ? "walkin" : "all";
  const hrefFor = (filter?: string) => {
    const p = new URLSearchParams();
    if (searchParams.range) p.set("range", searchParams.range);
    if (searchParams.from) p.set("from", searchParams.from);
    if (searchParams.to) p.set("to", searchParams.to);
    if (filter && filter !== "all") p.set("f", filter);
    const qs = p.toString();
    return `/reports/bookings${qs ? `?${qs}` : ""}#detail`;
  };

  let detail = counted.slice().sort((a, b) => toDate(b.pickup_at).getTime() - toDate(a.pickup_at).getTime());
  if (f === "online") detail = detail.filter((r) => r.source === "online");
  else if (f === "walkin") detail = detail.filter((r) => r.source !== "online");

  const statusBadge = (r: any) => {
    const eff = effectiveStatus(r, now);
    if (eff === "ACTIVE") return { cls: "bg-blue-100 text-blue-700", text: t("Active") };
    if (eff === "RESERVED") return { cls: "bg-amber-100 text-amber-700", text: t("Reserved") };
    return { cls: "bg-emerald-100 text-emerald-700", text: t("Completed") };
  };

  const COLS = "1.3fr 1.3fr 1.2fr 0.6fr 0.8fr 0.8fr";

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href={hrefFor("all")} className={cn("block rounded-2xl transition hover:shadow-md", f === "all" && "ring-2 ring-primary/40")}>
          <StatTile icon={CalendarCheck} tone="bg-primary/10 text-primary" label={t("Bookings")} value={String(total)} />
        </Link>
        <Link href={hrefFor("all")} className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={Clock} tone="bg-amber-100 text-amber-600" label={t("Avg. duration")} value={t("{n} days", { n: avgDuration })} />
        </Link>
        <Link href={hrefFor("all")} className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={Wallet} tone="bg-emerald-100 text-emerald-600" label={t("Avg. value")} value={formatMoney(avgValue, currency)} />
        </Link>
        <Link href={hrefFor("online")} className={cn("block rounded-2xl transition hover:shadow-md", f === "online" && "ring-2 ring-primary/40")}>
          <StatTile icon={Globe} tone="bg-blue-100 text-blue-600" label={t("Online share")} value={`${onlinePct}%`} />
        </Link>
      </div>

      {total > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <div className="border-b border-border/60 px-5 py-3.5">
              <h3 className="text-sm font-semibold tracking-tight">{t("Bookings over time")}</h3>
            </div>
            <CardContent className="p-4">
              <BarChart data={buckets} />
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <div className="border-b border-border/60 px-5 py-3.5">
              <h3 className="text-sm font-semibold tracking-tight">{t("Busiest weekdays")}</h3>
            </div>
            <CardContent className="p-4">
              <BarChart data={wdCounts} />
            </CardContent>
          </Card>
        </div>
      )}
      {total === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <p className="py-6 text-center text-sm text-muted-foreground">{t("No bookings in this period.")}</p>
          </CardContent>
        </Card>
      )}

      {/* Detailed listing */}
      <Card id="detail" className="scroll-mt-4 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 p-5">
          <h3 className="text-base font-semibold tracking-tight">{t("Booking details")}</h3>
          <div className="flex items-center gap-2">
            {f !== "all" && (
              <Link href={hrefFor("all")} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/15">
                {f === "online" ? t("Online") : t("Walk-in")} ✕
              </Link>
            )}
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {t("{n} of {m}", { n: detail.length, m: total })}
            </span>
          </div>
        </div>
        <CardContent className="p-0">
          {detail.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">{t("No bookings in this period.")}</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div
                  className="grid gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ gridTemplateColumns: COLS }}
                >
                  <span>{t("Client")}</span>
                  <span>{t("Car")}</span>
                  <span>{t("Dates")}</span>
                  <span>{t("days")}</span>
                  <span>{t("Value")}</span>
                  <span>{t("Status")}</span>
                </div>
                {detail.map((r) => {
                  const b = statusBadge(r);
                  const dur = r.open_ended ? "∞" : String(rentalDays(r.pickup_at, r.return_at));
                  const end = r.open_ended ? t("open") : formatDate(r.return_at);
                  return (
                    <Link
                      key={r.id}
                      href={`/rentals/${r.id}`}
                      className="grid items-center gap-3 border-t border-border/60 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                      style={{ gridTemplateColumns: COLS }}
                    >
                      <span className="truncate font-semibold">{r.client?.full_name ?? t("Booked")}</span>
                      <span className="min-w-0 truncate">
                        {r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : "—"}
                        {r.vehicle?.plate && <span className="ml-1 font-mono text-[11px] text-muted-foreground">{r.vehicle.plate}</span>}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{formatDate(r.pickup_at)} → {end}</span>
                      <span className="text-muted-foreground">{dur}</span>
                      <span className="font-bold">{formatMoney(r.total_cents ?? 0, currency)}</span>
                      <span>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", b.cls)}>
                          {r.source === "online" ? <Globe className="h-3 w-3" /> : <Store className="h-3 w-3" />}
                          {b.text}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
