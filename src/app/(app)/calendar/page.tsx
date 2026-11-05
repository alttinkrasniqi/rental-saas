import Link from "next/link";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, ArrowRight, ArrowDownLeft, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toDate, formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Vehicle } from "@/lib/types";
import { sq } from "date-fns/locale";
import { getT, getLocale } from "@/lib/i18n/server";
import type { TFunc } from "@/lib/i18n";
import { CalendarMatrix, type CalRow, type CalDay, type CalCell } from "./calendar-matrix";

const WEEK_OPTS = { weekStartsOn: 1 as const };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { view?: string; start?: string };
}) {
  const t = getT();
  const df = getLocale() === "sq" ? { locale: sq } : undefined;
  const view = searchParams.view === "month" ? "month" : searchParams.view === "day" ? "day" : "week";
  const anchor = searchParams.start ? new Date(searchParams.start) : new Date();
  const now = new Date();

  const windowStart =
    view === "month" ? startOfMonth(anchor) : view === "day" ? startOfDay(anchor) : startOfWeek(anchor, WEEK_OPTS);
  const windowEnd =
    view === "month" ? endOfMonth(anchor) : view === "day" ? endOfDay(anchor) : endOfWeek(anchor, WEEK_OPTS);
  const days = eachDayOfInterval({ start: windowStart, end: windowEnd });

  const supabase = createClient();
  const [{ data: vData }, { data: rData }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("archived", false).order("make", { ascending: true }),
    // Open rentals only. We DROP a return_at filter here so that ongoing
    // open-ended rentals (whose return_at is still a placeholder) are included;
    // coverage below treats them as out through today.
    supabase
      .from("rentals")
      .select("id, vehicle_id, status, open_ended, pickup_at, return_at, client:clients(full_name)")
      .in("status", ["ACTIVE", "RESERVED"])
      .lt("pickup_at", endOfDay(windowEnd).toISOString()),
  ]);

  const vehicles = (vData ?? []) as Vehicle[];
  const rentals = (rData ?? []) as any[];

  // Effective end of a rental: an ongoing open-ended ACTIVE rental is "out"
  // through now (its stored return_at is just a placeholder = pickup).
  const effEnd = (r: any) => (r.open_ended && r.status === "ACTIVE" ? now : toDate(r.return_at));
  const covers = (r: any, day: Date) =>
    toDate(r.pickup_at) <= endOfDay(day) && effEnd(r) >= startOfDay(day);
  const isOverdue = (r: any) => r.status === "ACTIVE" && !r.open_ended && toDate(r.return_at) < now;

  function cellCls(r: any) {
    if (isOverdue(r)) return "bg-rose-500 text-white";
    if (r.status === "ACTIVE") return "bg-blue-500 text-white";
    if (r.status === "RESERVED") return "bg-amber-400 text-amber-950";
    return "bg-slate-300 text-slate-700";
  }

  // Navigation
  const prev = view === "month" ? subMonths(windowStart, 1) : addDays(windowStart, view === "day" ? -1 : -7);
  const next = view === "month" ? addMonths(windowStart, 1) : addDays(windowStart, view === "day" ? 1 : 7);
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  const navHref = (d: Date) => `/calendar?view=${view}&start=${fmt(d)}`;

  const rangeLabel =
    view === "month"
      ? format(anchor, "MMMM yyyy", df)
      : view === "day"
      ? format(anchor, "EEEE, d MMM yyyy", df)
      : `${format(windowStart, "d MMM", df)} – ${format(windowEnd, "d MMM yyyy", df)}`;

  const nav = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Link href={navHref(prev)} className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card hover:bg-muted">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="min-w-[10rem] text-center text-sm font-semibold">{rangeLabel}</span>
        <Link href={navHref(next)} className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card hover:bg-muted">
          <ChevronRight className="h-4 w-4" />
        </Link>
        <Link href={`/calendar?view=${view}`} className="ml-1 flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm hover:bg-muted">
          {t("Today")}
        </Link>
      </div>
      <div className="flex items-center gap-1 rounded-md border border-input bg-card p-1">
        {(["day", "week", "month"] as const).map((v) => (
          <Link
            key={v}
            href={`/calendar?view=${v}`}
            className={cn("rounded px-3 py-1 text-sm font-medium", view === v ? "bg-primary/10 text-primary" : "text-muted-foreground")}
          >
            {t(v === "day" ? "Day" : v === "week" ? "Week" : "Month")}
          </Link>
        ))}
      </div>
    </div>
  );

  const legend = (
    <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
      <Legend className="bg-blue-500" label={t("Active (out)")} />
      <Legend className="bg-amber-400" label={t("Reserved")} />
      <Legend className="bg-rose-500" label={t("Overdue")} />
      <Legend className="bg-slate-300" label={t("In service")} />
    </div>
  );

  if (vehicles.length === 0) {
    return (
      <div>
        <PageHeader title={t("Calendar")} subtitle={t("See what's booked and what's free at a glance")} />
        {nav}
        <EmptyState
          icon={CalendarDays}
          title={t("No cars to show")}
          description={t("Add cars to your fleet to see them on the calendar.")}
          action={{ href: "/cars/new", label: t("Add car") }}
        />
      </div>
    );
  }

  // ---- Day view: an agenda for the single day ----
  if (view === "day") {
    const d = anchor;
    const pickups = rentals.filter((r) => isSameDay(toDate(r.pickup_at), d));
    const returns = rentals.filter((r) => r.status === "ACTIVE" && !r.open_ended && isSameDay(toDate(r.return_at), d));
    const vehName = new Map(vehicles.map((v) => [v.id, `${v.make} ${v.model}`]));
    const out = rentals.filter((r) => covers(r, d));

    return (
      <div>
        <PageHeader title={t("Calendar")} subtitle={t("See what's booked and what's free at a glance")} />
        {nav}
        <div className="grid gap-6 lg:grid-cols-3">
          <AgendaCard title={t("Pickups")} icon={<ArrowRight className="h-4 w-4 text-blue-600" />} rows={pickups} vehName={vehName} field="pickup_at" empty={t("No pickups.")} t={t} />
          <AgendaCard title={t("Returns")} icon={<ArrowDownLeft className="h-4 w-4 text-emerald-600" />} rows={returns} vehName={vehName} field="return_at" empty={t("No returns.")} t={t} />
          <AgendaCard title={t("Out this day")} icon={<KeyRound className="h-4 w-4 text-indigo-600" />} rows={out} vehName={vehName} empty={t("Nothing out.")} t={t} />
        </div>
        {legend}
      </div>
    );
  }

  // ---- Week / Month matrix ----
  const rows: CalRow[] = vehicles.map((v: any) => {
    const maint = v.status === "MAINTENANCE" || v.status === "UNAVAILABLE";
    const cells: CalCell[] = days.map((d) => {
      if (maint) return { t: "blocked" };
      const r = rentals.find((x) => x.vehicle_id === v.id && covers(x, d));
      if (!r) return { t: "free" };
      const open = r.open_ended && r.status === "ACTIVE";
      const label = `${r.client?.full_name ?? t("Booked")}${open ? ` (${t("open")})` : ""}`;
      const endLabel = open ? t("open") : formatDate(r.return_at);
      const title = `${r.client?.full_name ?? t("Booked")} · ${formatDate(r.pickup_at)} → ${endLabel}${isOverdue(r) ? ` · ${t("Overdue")}` : ""}`;
      return { t: "booked", id: r.id, cls: cellCls(r), isStart: isSameDay(toDate(r.pickup_at), d), label, title };
    });
    return { vehicleId: v.id, name: `${v.make} ${v.model}`, plate: v.plate, maintenance: maint, cells };
  });

  const daysMeta: CalDay[] = days.map((d) => ({
    key: fmt(d),
    dow: format(d, "EEE", df),
    dom: format(d, "d"),
    today: isToday(d),
  }));

  return (
    <div>
      <PageHeader title={t("Calendar")} subtitle={t("See what's booked and what's free — drag across free days to book")} />
      {nav}
      <CalendarMatrix
        rows={rows}
        days={daysMeta}
        maintenanceLabel={t("In service")}
        filterText={{ all: t("All"), booked: t("Booked"), free: t("Free") }}
      />
      {legend}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("inline-block h-3 w-3 rounded", className)} />
      {label}
    </span>
  );
}

function AgendaCard({
  title,
  icon,
  rows,
  vehName,
  field,
  empty,
  t,
}: {
  title: string;
  icon: React.ReactNode;
  rows: any[];
  vehName: Map<string, string>;
  field?: "pickup_at" | "return_at";
  empty: string;
  t: TFunc;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon} {title}
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{rows.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          rows.map((r) => (
            <Link
              key={r.id}
              href={`/rentals/${r.id}`}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5 hover:bg-muted"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{vehName.get(r.vehicle_id) ?? t("Vehicle")}</p>
                <p className="text-xs text-muted-foreground">{r.client?.full_name}</p>
              </div>
              {field && <span className="text-xs font-medium">{formatTime(r[field])}</span>}
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
