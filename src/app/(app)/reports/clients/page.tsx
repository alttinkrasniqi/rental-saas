import Link from "next/link";
import { isWithinInterval, differenceInCalendarDays } from "date-fns";
import { UserPlus, Users, Repeat, Wallet, MoonStar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, toDate, formatDate } from "@/lib/format";
import { resolveRange, type RangePreset } from "@/lib/date-range";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
import { StatTile } from "../report-ui";

export const dynamic = "force-dynamic";

const AV = [
  "bg-primary/10 text-primary", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700", "bg-violet-100 text-violet-700", "bg-rose-100 text-rose-700",
];

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export default async function ClientsReportPage({
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

  const [{ data: cData }, { data: rData }, { data: payData }] = await Promise.all([
    supabase.from("clients").select("id, full_name, created_at").not("deleted", "is", true),
    supabase.from("rentals").select("client_id, pickup_at, status").neq("status", "CANCELLED"),
    supabase.from("payments").select("amount_cents, paid_at, rental:rentals(client_id)"),
  ]);

  const clients = (cData ?? []) as any[];
  const rentals = (rData ?? []) as any[];
  const payments = ((payData ?? []) as any[]).filter((p) => isWithinInterval(toDate(p.paid_at), itv));

  const rentalsByClient = new Map<string, number>();
  const lastPickupByClient = new Map<string, string>();
  for (const r of rentals) {
    if (!r.client_id) continue;
    rentalsByClient.set(r.client_id, (rentalsByClient.get(r.client_id) ?? 0) + 1);
    const prev = lastPickupByClient.get(r.client_id);
    if (!prev || r.pickup_at > prev) lastPickupByClient.set(r.client_id, r.pickup_at);
  }

  const activeIds = new Set(rentals.filter((r) => isWithinInterval(toDate(r.pickup_at), itv)).map((r) => r.client_id));
  const newClients = clients.filter((c) => c.created_at && isWithinInterval(toDate(c.created_at), itv)).length;
  const activeClients = activeIds.size;
  const withAnyRental = [...rentalsByClient.keys()].length;
  const returning = [...rentalsByClient.values()].filter((n) => n >= 2).length;
  const returningRate = withAnyRental > 0 ? Math.round((returning / withAnyRental) * 100) : 0;

  const spendByClient = new Map<string, number>();
  for (const p of payments) {
    const cid = p.rental?.client_id;
    if (!cid) continue;
    spendByClient.set(cid, (spendByClient.get(cid) ?? 0) + (p.amount_cents ?? 0));
  }
  const totalSpend = [...spendByClient.values()].reduce((s, v) => s + v, 0);
  const avgSpend = activeClients > 0 ? Math.round(totalSpend / activeClients) : 0;

  const inactiveCount = [...rentalsByClient.keys()].filter((id) => {
    const lp = lastPickupByClient.get(id);
    return lp && differenceInCalendarDays(now, toDate(lp)) > 90;
  }).length;

  // --- Enriched client rows for the detailed listing + card filters ---
  const enriched = clients.map((c) => {
    const last = lastPickupByClient.get(c.id) ?? null;
    return {
      id: c.id,
      name: c.full_name as string,
      count: rentalsByClient.get(c.id) ?? 0,
      spent: spendByClient.get(c.id) ?? 0,
      last,
      isNew: !!(c.created_at && isWithinInterval(toDate(c.created_at), itv)),
      isActive: activeIds.has(c.id),
      isInactive: !!(last && differenceInCalendarDays(now, toDate(last)) > 90),
    };
  });

  const f = ["new", "inactive"].includes(searchParams.f ?? "") ? (searchParams.f as "new" | "inactive") : "all";
  const hrefFor = (filter?: string) => {
    const p = new URLSearchParams();
    if (searchParams.range) p.set("range", searchParams.range);
    if (searchParams.from) p.set("from", searchParams.from);
    if (searchParams.to) p.set("to", searchParams.to);
    if (filter && filter !== "all") p.set("f", filter);
    const qs = p.toString();
    return `/reports/clients${qs ? `?${qs}` : ""}#detail`;
  };

  let detail = enriched;
  if (f === "new") detail = enriched.filter((c) => c.isNew).sort((a, b) => b.spent - a.spent);
  else if (f === "inactive") detail = enriched.filter((c) => c.isInactive).sort((a, b) => (a.last ?? "").localeCompare(b.last ?? ""));
  else detail = enriched.filter((c) => c.isActive).sort((a, b) => b.spent - a.spent);

  const filterLabel = f === "new" ? t("New clients") : f === "inactive" ? t("Inactive") : t("Active clients");
  const COLS = "1.8fr 0.7fr 1fr 1fr";

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href={hrefFor("new")} className={cn("block rounded-2xl transition hover:shadow-md", f === "new" && "ring-2 ring-primary/40")}>
          <StatTile icon={UserPlus} tone="bg-primary/10 text-primary" label={t("New clients")} value={String(newClients)} />
        </Link>
        <Link href={hrefFor("all")} className={cn("block rounded-2xl transition hover:shadow-md", f === "all" && "ring-2 ring-primary/40")}>
          <StatTile icon={Users} tone="bg-blue-100 text-blue-600" label={t("Active clients")} value={String(activeClients)} />
        </Link>
        <Link href={hrefFor("all")} className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={Repeat} tone="bg-emerald-100 text-emerald-600" label={t("Returning rate")} value={`${returningRate}%`} />
        </Link>
        <Link href={hrefFor("all")} className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={Wallet} tone="bg-violet-100 text-violet-600" label={t("Avg spend / client")} value={formatMoney(avgSpend, currency)} />
        </Link>
      </div>

      {inactiveCount > 0 && (
        <Link href={hrefFor("inactive")} className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900 transition hover:bg-blue-100/70">
          <MoonStar className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            {t("{n} clients haven't rented in 90+ days — a good list to win back.", { n: inactiveCount })}
          </p>
        </Link>
      )}

      {/* Detailed listing */}
      <Card id="detail" className="scroll-mt-4 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 p-5">
          <h3 className="text-base font-semibold tracking-tight">{t("Client details")}</h3>
          <div className="flex items-center gap-2">
            {f !== "all" && (
              <Link href={hrefFor("all")} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/15">
                {filterLabel} ✕
              </Link>
            )}
            {detail.length > 0 && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{detail.length}</span>
            )}
          </div>
        </div>
        <CardContent className="p-0">
          {detail.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">{t("No clients in this period.")}</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[520px]">
                <div
                  className="grid gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ gridTemplateColumns: COLS }}
                >
                  <span>{t("Client")}</span>
                  <span>{t("Rentals")}</span>
                  <span>{t("Spent")}</span>
                  <span>{t("Last rental")}</span>
                </div>
                {detail.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/clients/${c.id}`}
                    className="grid items-center gap-3 border-t border-border/60 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                    style={{ gridTemplateColumns: COLS }}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", AV[i % AV.length])}>
                        {initials(c.name)}
                      </span>
                      <span className="truncate font-semibold">{c.name}</span>
                    </span>
                    <span className="text-muted-foreground">{c.count}</span>
                    <span className="font-bold text-emerald-600">{formatMoney(c.spent, currency)}</span>
                    <span className="text-xs text-muted-foreground">{c.last ? formatDate(c.last) : "—"}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
