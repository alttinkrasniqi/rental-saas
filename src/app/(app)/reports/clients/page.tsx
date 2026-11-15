import { isWithinInterval, differenceInCalendarDays } from "date-fns";
import { UserPlus, Users, Repeat, Wallet, MoonStar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, toDate } from "@/lib/format";
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

export default async function ClientsReportPage({
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

  const [{ data: cData }, { data: rData }, { data: payData }] = await Promise.all([
    supabase.from("clients").select("id, full_name, created_at").not("deleted", "is", true),
    supabase.from("rentals").select("client_id, pickup_at, status").neq("status", "CANCELLED"),
    supabase.from("payments").select("amount_cents, paid_at, rental:rentals(client_id)"),
  ]);

  const clients = (cData ?? []) as any[];
  const rentals = (rData ?? []) as any[];
  const payments = ((payData ?? []) as any[]).filter((p) => isWithinInterval(toDate(p.paid_at), itv));

  // Rentals-per-client (all time) → returning vs one-time.
  const rentalsByClient = new Map<string, number>();
  const lastPickupByClient = new Map<string, string>();
  for (const r of rentals) {
    if (!r.client_id) continue;
    rentalsByClient.set(r.client_id, (rentalsByClient.get(r.client_id) ?? 0) + 1);
    const prev = lastPickupByClient.get(r.client_id);
    if (!prev || r.pickup_at > prev) lastPickupByClient.set(r.client_id, r.pickup_at);
  }

  const newClients = clients.filter((c) => c.created_at && isWithinInterval(toDate(c.created_at), itv)).length;
  const activeIds = new Set(rentals.filter((r) => isWithinInterval(toDate(r.pickup_at), itv)).map((r) => r.client_id));
  const activeClients = activeIds.size;
  const withAnyRental = [...rentalsByClient.keys()].length;
  const returning = [...rentalsByClient.values()].filter((n) => n >= 2).length;
  const returningRate = withAnyRental > 0 ? Math.round((returning / withAnyRental) * 100) : 0;

  // Spend in period, per client (cash-basis).
  const spendByClient = new Map<string, number>();
  for (const p of payments) {
    const cid = p.rental?.client_id;
    if (!cid) continue;
    spendByClient.set(cid, (spendByClient.get(cid) ?? 0) + (p.amount_cents ?? 0));
  }
  const totalSpend = [...spendByClient.values()].reduce((s, v) => s + v, 0);
  const avgSpend = activeClients > 0 ? Math.round(totalSpend / activeClients) : 0;

  const nameById = new Map(clients.map((c) => [c.id, c.full_name]));
  const topClients = [...spendByClient.entries()]
    .map(([id, spent]) => ({ id, name: nameById.get(id) ?? t("Booked"), spent, count: 0 }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 8);
  for (const tc of topClients) tc.count = payments.filter((p) => p.rental?.client_id === tc.id).length;

  // Inactive: a real client (has rented before) with no rental in 90+ days.
  const inactive = [...rentalsByClient.keys()].filter((id) => {
    const lp = lastPickupByClient.get(id);
    return lp && differenceInCalendarDays(now, toDate(lp)) > 90;
  }).length;

  const avatarTones = [
    "bg-primary/10 text-primary", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700", "bg-violet-100 text-violet-700", "bg-rose-100 text-rose-700",
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={UserPlus} tone="bg-primary/10 text-primary" label={t("New clients")} value={String(newClients)} />
        <StatTile icon={Users} tone="bg-blue-100 text-blue-600" label={t("Active clients")} value={String(activeClients)} />
        <StatTile icon={Repeat} tone="bg-emerald-100 text-emerald-600" label={t("Returning rate")} value={`${returningRate}%`} />
        <StatTile icon={Wallet} tone="bg-violet-100 text-violet-600" label={t("Avg spend / client")} value={formatMoney(avgSpend, currency)} />
      </div>

      <Card className="rounded-2xl">
        <div className="flex items-center justify-between border-b border-border/60 p-5">
          <h3 className="text-base font-semibold tracking-tight">{t("Top clients")}</h3>
          {topClients.length > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{topClients.length}</span>
          )}
        </div>
        <CardContent className="p-0">
          {topClients.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">{t("No clients in this period.")}</p>
          ) : (
            topClients.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 border-t border-border/60 p-3.5 first:border-t-0">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold", avatarTones[i % avatarTones.length])}>
                  {initials(c.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(c.count === 1 ? "{n} payment" : "{n} payments", { n: c.count })}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700">
                  {formatMoney(c.spent, currency)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {inactive > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
          <MoonStar className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            {t("{n} clients haven't rented in 90+ days — a good list to win back.", { n: inactive })}
          </p>
        </div>
      )}
    </>
  );
}
