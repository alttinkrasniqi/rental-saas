import Link from "next/link";
import { isWithinInterval, differenceInCalendarDays } from "date-fns";
import { AlertTriangle, FileWarning, Users, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, toDate, remainingCents, effectiveStatus } from "@/lib/format";
import { resolveRange, type RangePreset } from "@/lib/date-range";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
import { StatTile } from "../report-ui";

export const dynamic = "force-dynamic";

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export default async function PaymentsReportPage({
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

  const [{ data: rData }, { data: payData }] = await Promise.all([
    supabase
      .from("rentals")
      .select("id, pickup_at, return_at, total_cents, paid_cents, status, open_ended, vehicle:vehicles(make, model, plate), client:clients(id, full_name)")
      .neq("status", "CANCELLED"),
    supabase.from("payments").select("amount_cents, paid_at"),
  ]);

  const rentals = (rData ?? []) as any[];
  const collected = ((payData ?? []) as any[])
    .filter((p) => isWithinInterval(toDate(p.paid_at), itv))
    .reduce((s, p) => s + (p.amount_cents ?? 0), 0);

  // Debtors: open rentals with money still owed (future reservations excluded).
  const debtors = rentals
    .map((r) => {
      const rem = remainingCents(r);
      const eff = effectiveStatus(r, now);
      if (rem <= 0 || eff === "RESERVED") return null;
      const ongoing = r.open_ended && eff === "ACTIVE";
      const overdue = ongoing ? -1 : differenceInCalendarDays(now, toDate(r.return_at));
      return {
        id: r.id,
        client: r.client?.full_name ?? t("Booked"),
        clientId: r.client?.id ?? r.id,
        car: r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : "—",
        plate: r.vehicle?.plate ?? "",
        amount: rem,
        ongoing,
        overdue,
      };
    })
    .filter(Boolean) as any[];
  debtors.sort((a, b) => b.amount - a.amount);

  const totalOutstanding = debtors.reduce((s, d) => s + d.amount, 0);
  const clientsWithDebt = new Set(debtors.map((d) => d.clientId)).size;

  // Aging buckets (by days overdue; ongoing/not-yet-due grouped as "not due").
  const AGING = [
    { key: "notdue", label: t("Not due yet"), color: "bg-slate-400" },
    { key: "d7", label: t("0–7 days"), color: "bg-amber-300" },
    { key: "d30", label: t("8–30 days"), color: "bg-amber-500" },
    { key: "d90", label: t("31–90 days"), color: "bg-orange-500" },
    { key: "d90p", label: t("90+ days"), color: "bg-rose-500" },
  ] as const;
  const agBucket = (d: any) => {
    if (d.ongoing || d.overdue <= 0) return "notdue";
    if (d.overdue <= 7) return "d7";
    if (d.overdue <= 30) return "d30";
    if (d.overdue <= 90) return "d90";
    return "d90p";
  };
  const agingSum: Record<string, number> = { notdue: 0, d7: 0, d30: 0, d90: 0, d90p: 0 };
  for (const d of debtors) agingSum[agBucket(d)] += d.amount;

  const statusText = (d: any) =>
    d.ongoing ? t("Ongoing (open)") : d.overdue <= 0 ? t("Not due yet") : t("{n} days overdue", { n: d.overdue });

  const avatarTones = [
    "bg-primary/10 text-primary", "bg-blue-100 text-blue-700", "bg-amber-100 text-amber-700",
    "bg-violet-100 text-violet-700", "bg-rose-100 text-rose-700", "bg-emerald-100 text-emerald-700",
  ];

  // Card/legend-driven filter for the debtor list (by aging bucket).
  const bucketKeys = AGING.map((a) => a.key as string);
  const f = bucketKeys.includes(searchParams.f ?? "") ? (searchParams.f as string) : "all";
  const hrefFor = (filter?: string) => {
    const p = new URLSearchParams();
    if (searchParams.range) p.set("range", searchParams.range);
    if (searchParams.from) p.set("from", searchParams.from);
    if (searchParams.to) p.set("to", searchParams.to);
    if (filter && filter !== "all") p.set("f", filter);
    const qs = p.toString();
    return `/reports/payments${qs ? `?${qs}` : ""}#detail`;
  };
  const shown = f === "all" ? debtors : debtors.filter((d) => agBucket(d) === f);
  const activeAging = AGING.find((a) => a.key === f);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href={hrefFor("all")} className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={AlertTriangle} tone={totalOutstanding > 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"} label={t("Total outstanding")} value={formatMoney(totalOutstanding, currency)} valueCls={totalOutstanding > 0 ? "text-rose-600" : undefined} />
        </Link>
        <Link href={hrefFor("all")} className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={FileWarning} tone="bg-amber-100 text-amber-600" label={t("Unpaid rentals")} value={String(debtors.length)} />
        </Link>
        <Link href={hrefFor("all")} className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={Users} tone="bg-violet-100 text-violet-600" label={t("Clients with debt")} value={String(clientsWithDebt)} />
        </Link>
        <Link href="/reports/revenue" className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={Wallet} tone="bg-emerald-100 text-emerald-600" label={t("Collected (period)")} value={formatMoney(collected, currency)} />
        </Link>
      </div>

      {totalOutstanding > 0 && (
        <Card className="rounded-2xl">
          <div className="border-b border-border/60 p-5">
            <h3 className="text-base font-semibold tracking-tight">{t("Receivables aging")}</h3>
          </div>
          <CardContent className="space-y-3 p-5">
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              {AGING.map((a) =>
                agingSum[a.key] > 0 ? (
                  <div key={a.key} className={a.color} style={{ width: `${(agingSum[a.key] / totalOutstanding) * 100}%` }} />
                ) : null
              )}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {AGING.filter((a) => agingSum[a.key] > 0).map((a) => (
                <Link key={a.key} href={hrefFor(a.key)} className={cn("flex items-center gap-2 rounded-lg px-1.5 py-0.5 transition-colors hover:bg-muted", f === a.key && "bg-muted ring-1 ring-primary/40")}>
                  <span className={cn("h-2.5 w-2.5 rounded-sm", a.color)} />
                  {a.label} <b className="font-bold">{formatMoney(agingSum[a.key], currency)}</b>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card id="detail" className="scroll-mt-4 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 p-5">
          <h3 className="text-base font-semibold tracking-tight">{t("Who owes you")}</h3>
          <div className="flex items-center gap-2">
            {f !== "all" && activeAging && (
              <Link href={hrefFor("all")} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/15">
                {activeAging.label} ✕
              </Link>
            )}
            {shown.length > 0 && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{shown.length}</span>
            )}
          </div>
        </div>
        <CardContent className="p-0">
          {shown.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600"><Wallet className="h-6 w-6" /></span>
              <p className="text-sm font-semibold">{t("No outstanding payments.")}</p>
              <p className="text-sm text-muted-foreground">{t("Everyone has paid up for this period. 🎉")}</p>
            </div>
          ) : (
            shown.slice(0, 30).map((d, i) => (
              <Link key={d.id} href={`/rentals/${d.id}`} className="flex items-center gap-3 border-t border-border/60 p-3.5 transition-colors first:border-t-0 hover:bg-muted/40">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold", avatarTones[i % avatarTones.length])}>
                  {initials(d.client)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{d.client}</p>
                  <p className="truncate text-xs text-muted-foreground">{d.car}{d.plate ? ` · ${d.plate}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-rose-600">{formatMoney(d.amount, currency)}</p>
                  <p className={cn("text-[11px]", !d.ongoing && d.overdue > 0 ? "font-semibold text-rose-500" : "text-muted-foreground")}>{statusText(d)}</p>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
