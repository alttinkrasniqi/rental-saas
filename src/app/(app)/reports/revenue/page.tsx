import Link from "next/link";
import {
  isWithinInterval, differenceInCalendarDays, eachDayOfInterval, eachMonthOfInterval,
  isSameDay, isSameMonth, format,
} from "date-fns";
import { Wallet, Receipt, AlertTriangle, CalendarDays, Globe, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, toDate, remainingCents, formatDate } from "@/lib/format";
import { resolveRange, type RangePreset } from "@/lib/date-range";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
import { StatTile, BarChart } from "../report-ui";

export const dynamic = "force-dynamic";

const SQ_MONTHS = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gsh", "Sht", "Tet", "Nën", "Dhj"];

export default async function RevenueReportPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string; f?: string };
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
    supabase.from("payments").select("amount_cents, paid_at, rental:rentals(id, source, vehicle:vehicles(make, model, plate), client:clients(full_name))"),
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

  // --- Detailed payments listing + card/source filter ---
  const f = searchParams.f === "online" ? "online" : searchParams.f === "walkin" ? "walkin" : "all";
  const hrefFor = (filter?: string) => {
    const p = new URLSearchParams();
    if (searchParams.range) p.set("range", searchParams.range);
    if (searchParams.from) p.set("from", searchParams.from);
    if (searchParams.to) p.set("to", searchParams.to);
    if (filter && filter !== "all") p.set("f", filter);
    const qs = p.toString();
    return `/reports/revenue${qs ? `?${qs}` : ""}#detail`;
  };
  let detail = payments.slice().sort((a, b) => toDate(b.paid_at).getTime() - toDate(a.paid_at).getTime());
  if (f === "online") detail = detail.filter((p) => p.rental?.source === "online");
  else if (f === "walkin") detail = detail.filter((p) => p.rental?.source !== "online");
  const COLS = "0.9fr 1.4fr 1.4fr 0.8fr 0.9fr";

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href={hrefFor("all")} className="block rounded-2xl transition hover:shadow-md">
          <Card className="relative h-full overflow-hidden rounded-2xl border-transparent bg-primary p-4 text-primary-foreground shadow-sm">
            <div className="flex items-start justify-between">
              <span className="text-[13px] font-medium text-primary-foreground/85">{t("Revenue collected")}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20"><Wallet className="h-4 w-4" /></span>
            </div>
            <p className="mt-3 text-[22px] font-extrabold leading-none tracking-tight">{formatMoney(collected, currency)}</p>
          </Card>
        </Link>
        <Link href={hrefFor("all")} className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={Receipt} tone="bg-blue-100 text-blue-600" label={t("Billed")} value={formatMoney(billed, currency)} />
        </Link>
        <Link href="/reports/payments" className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={AlertTriangle} tone={outstanding > 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"} label={t("Outstanding")} value={formatMoney(outstanding, currency)} valueCls={outstanding > 0 ? "text-rose-600" : undefined} />
        </Link>
        <Link href={hrefFor("all")} className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={CalendarDays} tone="bg-violet-100 text-violet-600" label={`${t("Revenue collected")} / ${t("days")}`} value={formatMoney(perDay, currency)} />
        </Link>
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
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href={hrefFor("online")} className={cn("flex items-center gap-2 rounded-lg px-1.5 py-0.5 transition-colors hover:bg-muted", f === "online" && "bg-muted ring-1 ring-primary/40")}>
              <Globe className="h-4 w-4 text-blue-500" />
              {t("Online")} <b className="font-bold">{formatMoney(onlineCollected, currency)}</b>
              <span className="text-xs text-muted-foreground">({onlinePct}%)</span>
            </Link>
            <Link href={hrefFor("walkin")} className={cn("flex items-center gap-2 rounded-lg px-1.5 py-0.5 transition-colors hover:bg-muted", f === "walkin" && "bg-muted ring-1 ring-primary/40")}>
              <Store className="h-4 w-4 text-primary" />
              {t("Walk-in")} <b className="font-bold">{formatMoney(walkinCollected, currency)}</b>
              <span className="text-xs text-muted-foreground">({100 - onlinePct}%)</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Detailed payments listing */}
      <Card id="detail" className="scroll-mt-4 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 p-5">
          <h3 className="text-base font-semibold tracking-tight">{t("Payment details")}</h3>
          <div className="flex items-center gap-2">
            {f !== "all" && (
              <Link href={hrefFor("all")} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/15">
                {f === "online" ? t("Online") : t("Walk-in")} ✕
              </Link>
            )}
            {detail.length > 0 && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{detail.length}</span>
            )}
          </div>
        </div>
        <CardContent className="p-0">
          {detail.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">{t("No revenue in this period.")}</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="grid gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" style={{ gridTemplateColumns: COLS }}>
                  <span>{t("Date")}</span>
                  <span>{t("Client")}</span>
                  <span>{t("Car")}</span>
                  <span>{t("Source")}</span>
                  <span className="text-right">{t("Value")}</span>
                </div>
                {detail.slice(0, 50).map((p, i) => {
                  const online = p.rental?.source === "online";
                  const rid = p.rental?.id;
                  const row = (
                    <>
                      <span className="text-xs text-muted-foreground">{formatDate(p.paid_at)}</span>
                      <span className="truncate font-semibold">{p.rental?.client?.full_name ?? "—"}</span>
                      <span className="min-w-0 truncate">{p.rental?.vehicle ? `${p.rental.vehicle.make} ${p.rental.vehicle.model}` : "—"}</span>
                      <span>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", online ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600")}>
                          {online ? <Globe className="h-3 w-3" /> : <Store className="h-3 w-3" />}
                          {online ? t("Online") : t("Walk-in")}
                        </span>
                      </span>
                      <span className="text-right font-bold text-emerald-600">{formatMoney(p.amount_cents ?? 0, currency)}</span>
                    </>
                  );
                  return rid ? (
                    <Link key={i} href={`/rentals/${rid}`} className="grid items-center gap-3 border-t border-border/60 px-4 py-3 text-sm transition-colors hover:bg-muted/40" style={{ gridTemplateColumns: COLS }}>
                      {row}
                    </Link>
                  ) : (
                    <div key={i} className="grid items-center gap-3 border-t border-border/60 px-4 py-3 text-sm" style={{ gridTemplateColumns: COLS }}>
                      {row}
                    </div>
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
