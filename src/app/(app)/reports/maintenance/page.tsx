import Link from "next/link";
import { differenceInCalendarDays, startOfDay, format } from "date-fns";
import { Clock, AlertTriangle, Wrench, MoonStar, Shield, FileText, BadgeCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent } from "@/components/ui/card";
import { toDate, formatDate } from "@/lib/format";
import { resolveRange, type RangePreset } from "@/lib/date-range";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
import { StatTile } from "../report-ui";
import type { Vehicle } from "@/lib/types";

export const dynamic = "force-dynamic";

const DUE_SOON_DAYS = 30;

export default async function MaintenanceReportPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string; f?: string };
}) {
  const t = getT();
  await getBusiness();
  const supabase = createClient();
  const now = new Date();
  const today = startOfDay(now);

  const range = resolveRange((searchParams.range as RangePreset) || "this_month", searchParams.from, searchParams.to);

  const [{ data: vData }, { data: bData }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("archived", false),
    supabase.from("maintenance_blocks").select("vehicle_id, start_date, end_date"),
  ]);

  const vehicles = (vData ?? []) as Vehicle[];
  const blocks = (bData ?? []) as any[];

  const ITEMS: { key: keyof Vehicle; label: string; icon: LucideIcon }[] = [
    { key: "insurance_expiry", label: t("Insurance"), icon: Shield },
    { key: "registration_expiry", label: t("Registration"), icon: FileText },
    { key: "inspection_expiry", label: t("Technical inspection"), icon: BadgeCheck },
    { key: "service_due", label: t("Service"), icon: Wrench },
  ];

  const rows = vehicles
    .flatMap((v: any) =>
      ITEMS.map((it) => {
        const ds = v[it.key] as string | null;
        if (!ds) return null;
        const days = differenceInCalendarDays(toDate(ds), today);
        return {
          id: `${v.id}-${String(it.key)}`,
          vid: v.id,
          name: `${v.make} ${v.model}`,
          plate: v.plate,
          item: it.label,
          icon: it.icon,
          date: ds,
          days,
          overdue: days < 0,
        };
      })
    )
    .filter(Boolean) as any[];

  const upcoming = rows.filter((r) => r.days <= DUE_SOON_DAYS).sort((a, b) => a.days - b.days);
  const expiringSoon = upcoming.filter((r) => r.days >= 0).length;
  const overdue = upcoming.filter((r) => r.overdue).length;

  // Cars in service now: status flag, or a block covering today.
  const todayKey = format(now, "yyyy-MM-dd");
  const blockedToday = new Set(blocks.filter((b) => b.start_date <= todayKey && b.end_date >= todayKey).map((b) => b.vehicle_id));
  const inService = new Set<string>([
    ...vehicles.filter((v: any) => v.status === "MAINTENANCE" || v.status === "UNAVAILABLE").map((v: any) => v.id),
    ...blockedToday,
  ]).size;

  // Downtime days in the selected period (overlap of blocks with the range).
  const rs = range.start.getTime();
  const re = range.end.getTime();
  let downtime = 0;
  for (const b of blocks) {
    const s = Math.max(new Date(b.start_date).getTime(), rs);
    const e = Math.min(new Date(b.end_date).getTime(), re);
    if (e >= s) downtime += differenceInCalendarDays(new Date(e), new Date(s)) + 1;
  }

  const badge = (r: any) => {
    if (r.overdue) return { cls: "bg-rose-100 text-rose-700", text: t("{n} days overdue", { n: Math.abs(r.days) }) };
    if (r.days === 0) return { cls: "bg-rose-100 text-rose-700", text: t("Today") };
    if (r.days <= 7) return { cls: "bg-amber-100 text-amber-700", text: t("{n} days left", { n: r.days }) };
    return { cls: "bg-slate-100 text-slate-600", text: t("{n} days left", { n: r.days }) };
  };

  // Card-driven filter for the detailed list.
  const f = searchParams.f === "overdue" ? "overdue" : searchParams.f === "soon" ? "soon" : "all";
  const hrefFor = (filter?: string) => {
    const p = new URLSearchParams();
    if (searchParams.range) p.set("range", searchParams.range);
    if (searchParams.from) p.set("from", searchParams.from);
    if (searchParams.to) p.set("to", searchParams.to);
    if (filter && filter !== "all") p.set("f", filter);
    const qs = p.toString();
    return `/reports/maintenance${qs ? `?${qs}` : ""}#detail`;
  };
  const shown = f === "overdue" ? upcoming.filter((r) => r.overdue) : f === "soon" ? upcoming.filter((r) => !r.overdue) : upcoming;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href={hrefFor("soon")} className={cn("block rounded-2xl transition hover:shadow-md", f === "soon" && "ring-2 ring-primary/40")}>
          <StatTile icon={Clock} tone="bg-amber-100 text-amber-600" label={t("Expiring soon (30 days)")} value={String(expiringSoon)} />
        </Link>
        <Link href={hrefFor("overdue")} className={cn("block rounded-2xl transition hover:shadow-md", f === "overdue" && "ring-2 ring-primary/40")}>
          <StatTile icon={AlertTriangle} tone={overdue > 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"} label={t("Overdue")} value={String(overdue)} valueCls={overdue > 0 ? "text-rose-600" : undefined} />
        </Link>
        <Link href="/cars?status=MAINTENANCE" className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={Wrench} tone="bg-blue-100 text-blue-600" label={t("Cars in service")} value={String(inService)} />
        </Link>
        <Link href={hrefFor("all")} className="block rounded-2xl transition hover:shadow-md">
          <StatTile icon={MoonStar} tone="bg-violet-100 text-violet-600" label={t("Downtime days")} value={String(downtime)} />
        </Link>
      </div>

      <Card id="detail" className="scroll-mt-4 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 p-5">
          <h3 className="text-base font-semibold tracking-tight">{t("Upcoming & overdue")}</h3>
          <div className="flex items-center gap-2">
            {f !== "all" && (
              <Link href={hrefFor("all")} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/15">
                {f === "overdue" ? t("Overdue") : t("Expiring soon (30 days)")} ✕
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
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600"><BadgeCheck className="h-6 w-6" /></span>
              <p className="text-sm font-semibold">{t("All dates are up to date.")}</p>
            </div>
          ) : (
            shown.map((r) => {
              const b = badge(r);
              const Icon = r.icon;
              return (
                <Link key={r.id} href={`/cars/${r.vid}`} className="flex items-center gap-3 border-t border-border/60 p-3.5 transition-colors first:border-t-0 hover:bg-muted/40">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", r.overdue ? "bg-rose-50 text-rose-600" : "bg-muted text-muted-foreground")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {r.name} <span className="font-mono text-[11px] text-muted-foreground">{r.plate}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{r.item} · {formatDate(r.date)}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", b.cls)}>{b.text}</span>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </>
  );
}
