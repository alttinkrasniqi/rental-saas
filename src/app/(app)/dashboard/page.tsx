import Link from "next/link";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
} from "date-fns";
import {
  ArrowRight, ArrowDownLeft, AlertTriangle, KeyRound, Globe, BellRing, RotateCcw, CalendarPlus,
  Plus, Car, ClipboardList, Wallet, Gauge, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatDate, formatTime, toDate, rentalDays, remainingCents, effectiveStatus } from "@/lib/format";
import { carsOutNow, carsReservedSoon, liveVehicleStatus } from "@/lib/availability";
import { markReturned } from "../rentals/actions";
import { getT } from "@/lib/i18n/server";
import type { TFunc } from "@/lib/i18n";
import type { Vehicle } from "@/lib/types";
import { GettingStarted } from "@/components/getting-started";
import { WelcomeModal } from "@/components/welcome-modal";

const WEEK_OPTS = { weekStartsOn: 1 as const };

export default async function DashboardPage() {
  const t = getT();
  const business = await getBusiness();
  const currency = business?.currency ?? "EUR";
  const supabase = createClient();
  const now = new Date();

  const [{ data: vData }, { data: rData }, { data: pData }, clientsRes, siteRes] = await Promise.all([
    supabase.from("vehicles").select("*").eq("archived", false),
    supabase
      .from("rentals")
      .select("id, vehicle_id, status, open_ended, source, created_at, pickup_at, return_at, total_cents, paid_cents, vehicle:vehicles(make, model, plate), client:clients(full_name, phone)")
      .neq("status", "CANCELLED"),
    supabase.from("payments").select("amount_cents, paid_at"),
    supabase.from("clients").select("id", { count: "exact", head: true }),
    business?.id
      ? supabase.from("site_settings").select("business_id").eq("business_id", business.id).maybeSingle()
      : Promise.resolve({ data: null } as any),
  ]);

  const vehicles = (vData ?? []) as Vehicle[];
  const rentals = (rData ?? []) as any[];
  const payments = (pData ?? []) as any[];

  // "Get started" checklist completion
  const gsDetails = !!(business?.phone && business?.address);
  const gsCar = vehicles.length > 0;
  const gsWebsite = !!(siteRes as any)?.data;
  const gsClient = ((clientsRes as any)?.count ?? 0) > 0;
  const firstStepHref = !gsDetails ? "/settings" : !gsCar ? "/cars/new" : !gsWebsite ? "/website" : !gsClient ? "/clients/new" : undefined;

  const openRentals = rentals.filter((r) => r.status === "ACTIVE" || r.status === "RESERVED");
  const outNow = carsOutNow(openRentals, now);
  const reservedSoon = carsReservedSoon(openRentals, outNow, now);
  const liveStatuses = vehicles.map((v: any) => liveVehicleStatus(v.status, v.id, outNow, reservedSoon));
  const countLive = (s: string) => liveStatuses.filter((x) => x === s).length;

  const todayItv = { start: startOfDay(now), end: endOfDay(now) };
  const pickupsToday = rentals.filter(
    (r) => (r.status === "RESERVED" || r.status === "ACTIVE") && isWithinInterval(toDate(r.pickup_at), todayItv)
  );
  const eff = (r: any) => effectiveStatus(r, now);
  const returnsToday = rentals.filter(
    (r) => eff(r) === "ACTIVE" && !r.open_ended && isWithinInterval(toDate(r.return_at), todayItv)
  );
  const activeCount = rentals.filter((r) => eff(r) === "ACTIVE").length;
  const overdue = rentals.filter((r) => eff(r) === "ACTIVE" && !r.open_ended && toDate(r.return_at) < now);
  const stillOut = rentals.filter((r) => eff(r) === "ACTIVE" && r.open_ended);

  const attention = [
    ...overdue.map((r) => ({ r, kind: "overdue" as const })),
    ...returnsToday
      .filter((r) => !overdue.some((o) => o.id === r.id))
      .map((r) => ({ r, kind: "today" as const })),
  ];

  const onlineBookings = rentals
    .filter((r) => r.source === "online")
    .sort((a, b) => toDate(b.created_at).getTime() - toDate(a.created_at).getTime());
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const recentOnline = onlineBookings.filter((r) => toDate(r.created_at) >= threeDaysAgo);

  const sumRange = (start: Date, end: Date) =>
    payments
      .filter((p) => {
        const d = toDate(p.paid_at);
        return d >= start && d <= end;
      })
      .reduce((s, p) => s + (p.amount_cents ?? 0), 0);
  const revMonth = sumRange(startOfMonth(now), endOfMonth(now));

  // This month vs last month (context for the headline number).
  const lastM = subMonths(now, 1);
  const revLastMonth = sumRange(startOfMonth(lastM), endOfMonth(lastM));
  const monthDelta =
    revLastMonth > 0 ? Math.round(((revMonth - revLastMonth) / revLastMonth) * 100) : null;

  // 6-month revenue trend (cash-basis, by payment date).
  const SQ_MONTHS = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gsh", "Sht", "Tet", "Nën", "Dhj"];
  const trend = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    const s = startOfMonth(d);
    const e = endOfMonth(d);
    return {
      label: SQ_MONTHS[d.getMonth()],
      value: sumRange(s, e),
      from: s.toISOString().slice(0, 10),
      to: e.toISOString().slice(0, 10),
    };
  });
  const maxTrend = Math.max(1, ...trend.map((m) => m.value));

  // Fleet utilization right now + money still to collect on open rentals.
  const utilization = vehicles.length ? Math.round((outNow.size / vehicles.length) * 100) : 0;
  const toCollect = openRentals.reduce((s, r) => s + remainingCents(r), 0);
  const unpaidCount = openRentals.filter((r) => remainingCents(r) > 0).length;

  // Fleet breakdown for the status bar.
  const total = vehicles.length;
  const fleet = [
    { label: t("Available"), n: countLive("AVAILABLE"), color: "#10b981", href: "/cars?status=AVAILABLE" },
    { label: t("Rented"), n: countLive("RENTED"), color: "#3b82f6", href: "/cars?status=RENTED" },
    { label: t("Reserved"), n: countLive("RESERVED"), color: "#f59e0b", href: "/cars?status=RESERVED" },
    { label: t("Maintenance"), n: countLive("MAINTENANCE"), color: "#f97316", href: "/cars?status=MAINTENANCE" },
  ];

  const upcoming = [
    ...rentals
      .filter((r) => eff(r) === "RESERVED" && toDate(r.pickup_at) >= startOfDay(now))
      .map((r) => ({ type: "Pickup" as const, at: r.pickup_at, r })),
    ...rentals
      .filter((r) => eff(r) === "ACTIVE" && !r.open_ended && toDate(r.return_at) >= startOfDay(now))
      .map((r) => ({ type: "Return" as const, at: r.return_at, r })),
  ]
    .sort((a, b) => toDate(a.at).getTime() - toDate(b.at).getTime())
    .slice(0, 8);

  // Maintenance reminders: compliance/service dates within 30 days or past.
  const DUE_SOON_DAYS = 30;
  const today0 = startOfDay(now);
  const MAINT_ITEMS: { key: string; label: string }[] = [
    { key: "insurance_expiry", label: t("Insurance") },
    { key: "registration_expiry", label: t("Registration") },
    { key: "inspection_expiry", label: t("Technical inspection") },
    { key: "service_due", label: t("Service") },
  ];
  const reminders = vehicles
    .flatMap((v: any) =>
      MAINT_ITEMS.map((it) => {
        const ds = v[it.key] as string | null;
        if (!ds) return null;
        const days = Math.round((startOfDay(toDate(ds)).getTime() - today0.getTime()) / 86400000);
        if (days > DUE_SOON_DAYS) return null;
        return { vehicleId: v.id, name: `${v.make} ${v.model}`, plate: v.plate, item: it.label, date: ds, days, overdue: days < 0 };
      })
    )
    .filter(Boolean)
    .sort((a: any, b: any) => a.days - b.days) as {
    vehicleId: string; name: string; plate: string; item: string; date: string; days: number; overdue: boolean;
  }[];

  return (
    <div className="space-y-6">
      <WelcomeModal seen={!!(business as any)?.welcome_seen} startHref={firstStepHref} />

      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {business ? business.name : t("Dashboard")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(now)} · {t("Here's what's happening today.")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/rentals/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> {t("New rental")}
          </Link>
          <Link
            href="/cars/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-card px-3.5 text-sm font-semibold transition hover:bg-muted"
          >
            <Car className="h-4 w-4" /> {t("Add car")}
          </Link>
        </div>
      </div>

      <GettingStarted details={gsDetails} car={gsCar} website={gsWebsite} client={gsClient} />

      {recentOnline.length > 0 && (
        <Link
          href="#online"
          className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
        >
          <BellRing className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">
            {t(
              recentOnline.length === 1
                ? "{count} new online booking in the last 3 days — scroll down to review."
                : "{count} new online bookings in the last 3 days — scroll down to review.",
              { count: recentOnline.length }
            )}
          </span>
        </Link>
      )}

      {/* Executive KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/rentals?paid=this_month" className="group block">
          <Card className="h-full border-transparent bg-primary p-5 text-primary-foreground transition group-hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[13px] font-medium text-primary-foreground/85">{t("Revenue this month")}</span>
              {monthDelta != null && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
                  {monthDelta >= 0 ? "▲" : "▼"} {Math.abs(monthDelta)}%
                </span>
              )}
            </div>
            <p className="mt-2 text-[28px] font-extrabold leading-none tracking-tight">{formatMoney(revMonth, currency)}</p>
            <p className="mt-2 text-[11.5px] text-primary-foreground/80">
              {t("vs last month")} · {formatMoney(revLastMonth, currency)}
            </p>
          </Card>
        </Link>

        <KpiTile
          href="/rentals?status=ACTIVE"
          label={t("Active rentals")}
          value={String(activeCount)}
          sub={t("cars out now")}
          icon={ClipboardList}
        />
        <KpiTile
          href="/cars?status=RENTED"
          label={t("Fleet in use now")}
          value={`${utilization}%`}
          sub={t("{out} of {total} cars out", { out: outNow.size, total: vehicles.length })}
          icon={Gauge}
          valueTone="text-primary"
        />
        <KpiTile
          href="/rentals?unpaid=1"
          label={t("To collect")}
          value={formatMoney(toCollect, currency)}
          sub={unpaidCount > 0 ? t("{n} unpaid", { n: unpaidCount }) : t("Unpaid on open rentals")}
          icon={Wallet}
          iconTone={toCollect > 0 ? "bg-rose-50 text-rose-600" : undefined}
          valueTone={toCollect > 0 ? "text-rose-600" : undefined}
        />
      </div>

      {/* Fleet status bar */}
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Fleet")}</p>
          <Link href="/cars" className="text-xs font-semibold text-primary hover:underline">
            {t("Cars")} →
          </Link>
        </div>
        <div className="mb-3.5 flex h-2.5 overflow-hidden rounded-full bg-muted">
          {total > 0 &&
            fleet.map((f) =>
              f.n > 0 ? (
                <div key={f.label} style={{ width: `${(f.n / total) * 100}%`, backgroundColor: f.color }} />
              ) : null
            )}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <span className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#64748b" }} />
            {t("Total cars")} <b className="font-bold">{total}</b>
          </span>
          {fleet.map((f) => (
            <Link key={f.label} href={f.href} className="flex items-center gap-2 text-sm hover:underline">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: f.color }} />
              {f.label} <b className="font-bold">{f.n}</b>
            </Link>
          ))}
        </div>
      </Card>

      {/* Two columns: main + rail */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* MAIN */}
        <div className="space-y-6">
          {attention.length > 0 && (
            <Card className="border-rose-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-700">
                  <AlertTriangle className="h-4 w-4" />
                  {t("Needs attention")}
                  <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    {attention.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {attention.map(({ r, kind }) => (
                  <AttentionRow key={r.id} r={r} kind={kind} now={now} t={t} />
                ))}
              </CardContent>
            </Card>
          )}

          {reminders.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <Wrench className="h-4 w-4" />
                  {t("Maintenance due")}
                  <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{reminders.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {reminders.slice(0, 8).map((rm, i) => (
                  <Link
                    key={i}
                    href={`/cars/${rm.vehicleId}/edit`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {rm.name} <span className="text-muted-foreground">{rm.plate}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{rm.item} · {formatDate(rm.date)}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        rm.overdue ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {rm.overdue
                        ? t(rm.days === -1 ? "{n} day overdue" : "{n} days overdue", { n: -rm.days })
                        : rm.days === 0
                        ? t("Today")
                        : t(rm.days === 1 ? "in {n} day" : "in {n} days", { n: rm.days })}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">{t("Revenue — last 6 months")}</CardTitle>
              <span className="text-xs text-muted-foreground">{t("by collection date")}</span>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2" style={{ height: 130 }}>
                {trend.map((m, i) => {
                  const isCurrent = i === trend.length - 1;
                  const h = Math.round((m.value / maxTrend) * 100);
                  return (
                    <Link
                      key={i}
                      href={`/rentals?paid_from=${m.from}&paid_to=${m.to}`}
                      className="group flex flex-1 flex-col items-center gap-1.5"
                    >
                      <span className={`text-[10px] font-medium ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                        {m.value > 0 ? formatMoney(m.value, currency) : ""}
                      </span>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className={`w-full rounded-t-md transition group-hover:opacity-80 ${isCurrent ? "bg-primary" : "bg-primary/25"}`}
                          style={{ height: `${Math.max(h, 2)}%` }}
                        />
                      </div>
                      <span className={`text-[11px] ${isCurrent ? "font-semibold" : "text-muted-foreground"}`}>{m.label}</span>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("Today")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 sm:grid-cols-2">
                <TodayBlock title={t("Pickups")} icon={<ArrowRight className="h-4 w-4 text-blue-600" />} items={pickupsToday} field="pickup_at" empty={t("No pickups today.")} tr={t} />
                <TodayBlock title={t("Returns")} icon={<ArrowDownLeft className="h-4 w-4 text-emerald-600" />} items={returnsToday} field="return_at" empty={t("No returns today.")} tr={t} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RAIL */}
        <div className="space-y-6">
          {onlineBookings.length > 0 && (
            <Card id="online">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4 text-amber-600" /> {t("Online bookings")}
                </CardTitle>
                {recentOnline.length > 0 && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {t("{n} new", { n: recentOnline.length })}
                  </span>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {onlineBookings.slice(0, 5).map((r) => (
                  <Link
                    key={r.id}
                    href={`/rentals/${r.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : t("Vehicle")}{" "}
                        <span className="text-muted-foreground">{r.vehicle?.plate}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.client?.full_name} · {formatDate(r.pickup_at)} → {formatDate(r.return_at)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Upcoming")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("Nothing scheduled. Your fleet is free.")}</p>
              ) : (
                upcoming.map((u, i) => (
                  <Link
                    key={i}
                    href={`/rentals/${u.r.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {u.r.vehicle ? `${u.r.vehicle.make} ${u.r.vehicle.model}` : t("Vehicle")}{" "}
                        <span className="text-muted-foreground">{u.r.vehicle?.plate}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{u.r.client?.full_name}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold">{t(u.type)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(u.at)}</p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {stillOut.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <KeyRound className="h-4 w-4 text-indigo-600" /> {t("Cars still out")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stillOut.map((r) => {
                  const out = rentalDays(r.pickup_at, now);
                  return (
                    <Link
                      key={r.id}
                      href={`/rentals/${r.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : t("Vehicle")}{" "}
                          <span className="text-muted-foreground">{r.vehicle?.plate}</span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{r.client?.full_name} · {t("open-ended")}</p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold">
                        {t(out === 1 ? "{n} day out" : "{n} days out", { n: out })}
                      </span>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiTile({
  href,
  label,
  value,
  sub,
  icon: Icon,
  iconTone,
  valueTone,
}: {
  href: string;
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  iconTone?: string;
  valueTone?: string;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full p-5 transition group-hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconTone ?? "bg-primary/10 text-primary"}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className={`mt-2 text-[28px] font-extrabold leading-none tracking-tight ${valueTone ?? ""}`}>{value}</p>
        <p className="mt-2 text-[11.5px] text-muted-foreground">{sub}</p>
      </Card>
    </Link>
  );
}

function AttentionRow({ r, kind, now, t }: { r: any; kind: "overdue" | "today"; now: Date; t: TFunc }) {
  const lateDays = kind === "overdue" ? rentalDays(r.return_at, now) : 0;
  const isOverdue = kind === "overdue";

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${
        isOverdue ? "border-rose-200 bg-rose-50/60" : "border-amber-200 bg-amber-50/60"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/rentals/${r.id}`} className="truncate text-sm font-semibold hover:underline">
            {r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : t("Vehicle")}
          </Link>
          {r.vehicle?.plate && (
            <span className="rounded bg-slate-900/80 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">
              {r.vehicle.plate}
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              isOverdue ? "bg-rose-600 text-white" : "bg-amber-500 text-white"
            }`}
          >
            {isOverdue
              ? t(lateDays === 1 ? "Overdue · {n} day" : "Overdue · {n} days", { n: lateDays })
              : t("Due back today")}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {r.client?.full_name ?? t("Client")}
          {r.client?.phone ? ` · ${r.client.phone}` : ""} · {t("was due {date} {time}", { date: formatDate(r.return_at), time: formatTime(r.return_at) })}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <form action={markReturned}>
          <input type="hidden" name="rental_id" value={r.id} />
          <input type="hidden" name="vehicle_id" value={r.vehicle_id} />
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <RotateCcw className="h-4 w-4" /> {t("Mark returned")}
          </button>
        </form>
        <Link
          href={`/rentals/${r.id}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-white px-3 text-sm font-medium hover:bg-muted"
        >
          <CalendarPlus className="h-4 w-4" /> {t("Extend")}
        </Link>
      </div>
    </div>
  );
}

function TodayBlock({
  title,
  icon,
  items,
  field,
  empty,
  tr,
}: {
  title: string;
  icon: React.ReactNode;
  items: any[];
  field: "pickup_at" | "return_at";
  empty: string;
  tr: TFunc;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-medium">
        {icon} {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <Link
              key={r.id}
              href={`/rentals/${r.id}`}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5 hover:bg-muted"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : tr("Vehicle")}{" "}
                  <span className="text-muted-foreground">{r.vehicle?.plate}</span>
                </p>
                <p className="text-xs text-muted-foreground">{r.client?.full_name}</p>
              </div>
              <span className="text-xs font-medium">{formatTime(r[field])}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
