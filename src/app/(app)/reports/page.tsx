import Link from "next/link";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import {
  ArrowRight, ArrowDownLeft, AlertTriangle, KeyRound, Globe, BellRing, RotateCcw, CalendarPlus,
  Plus, Car, CheckCircle2, CalendarClock, Wrench, ClipboardList, Wallet, Coins, TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatDate, formatTime, toDate, rentalDays } from "@/lib/format";
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
      .select("id, vehicle_id, status, open_ended, source, created_at, pickup_at, return_at, vehicle:vehicles(make, model, plate), client:clients(full_name, phone)")
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
  const returnsToday = rentals.filter(
    (r) => r.status === "ACTIVE" && !r.open_ended && isWithinInterval(toDate(r.return_at), todayItv)
  );
  const activeCount = rentals.filter((r) => r.status === "ACTIVE").length;
  const overdue = rentals.filter((r) => r.status === "ACTIVE" && !r.open_ended && toDate(r.return_at) < now);
  const stillOut = rentals.filter((r) => r.status === "ACTIVE" && r.open_ended);

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
  const revToday = sumRange(startOfDay(now), endOfDay(now));
  const revWeek = sumRange(startOfWeek(now, WEEK_OPTS), endOfWeek(now, WEEK_OPTS));
  const revMonth = sumRange(startOfMonth(now), endOfMonth(now));

  const upcoming = [
    ...rentals
      .filter((r) => r.status === "RESERVED" && toDate(r.pickup_at) >= startOfDay(now))
      .map((r) => ({ type: "Pickup" as const, at: r.pickup_at, r })),
    ...rentals
      .filter((r) => r.status === "ACTIVE" && !r.open_ended && toDate(r.return_at) >= startOfDay(now))
      .map((r) => ({ type: "Return" as const, at: r.return_at, r })),
  ]
    .sort((a, b) => toDate(a.at).getTime() - toDate(b.at).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <WelcomeModal seen={!!(business as any)?.welcome_seen} startHref={firstStepHref} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {business ? business.name : t("Dashboard")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("Here's what's happening today.")}</p>
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

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Fleet")}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat href="/cars" label={t("Total cars")} value={vehicles.length} icon={Car} />
          <Stat href="/cars" label={t("Available")} value={countLive("AVAILABLE")} tone="emerald" icon={CheckCircle2} />
          <Stat href="/cars" label={t("Rented")} value={countLive("RENTED")} tone="blue" icon={KeyRound} />
          <Stat href="/cars" label={t("Reserved")} value={countLive("RESERVED")} tone="amber" icon={CalendarClock} />
          <Stat href="/cars" label={t("Maintenance")} value={countLive("MAINTENANCE")} tone="orange" icon={Wrench} />
          <Stat href="/rentals" label={t("Active rentals")} value={activeCount} icon={ClipboardList} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Earnings")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <RevCard label={t("Revenue today")} value={formatMoney(revToday, currency)} icon={Coins} />
          <RevCard label={t("This week")} value={formatMoney(revWeek, currency)} icon={Wallet} />
          <RevCard label={t("This month")} value={formatMoney(revMonth, currency)} icon={TrendingUp} emphasize />
        </div>
      </div>

      {onlineBookings.length > 0 && (
        <Card id="online">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-amber-600" /> {t("Online bookings")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {onlineBookings.slice(0, 6).map((r) => (
              <Link
                key={r.id}
                href={`/rentals/${r.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3 hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : t("Vehicle")}{" "}
                    <span className="text-muted-foreground">{r.vehicle?.plate}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.client?.full_name} · {formatDate(r.pickup_at)} → {formatDate(r.return_at)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{t("booked {date}", { date: formatDate(r.created_at) })}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {stillOut.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3 hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : t("Vehicle")}{" "}
                      <span className="text-muted-foreground">{r.vehicle?.plate}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{r.client?.full_name} · {t("open-ended")}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium">
                    {t(out === 1 ? "{n} day out" : "{n} days out", { n: out })}
                  </span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("Today")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TodayBlock title={t("Pickups")} icon={<ArrowRight className="h-4 w-4 text-blue-600" />} items={pickupsToday} field="pickup_at" empty={t("No pickups today.")} tr={t} />
            <TodayBlock title={t("Returns")} icon={<ArrowDownLeft className="h-4 w-4 text-emerald-600" />} items={returnsToday} field="return_at" empty={t("No returns today.")} tr={t} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("Upcoming")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Nothing scheduled. Your fleet is free.")}</p>
            ) : (
              upcoming.map((u, i) => (
                <Link
                  key={i}
                  href={`/rentals/${u.r.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3 hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {u.r.vehicle ? `${u.r.vehicle.make} ${u.r.vehicle.model}` : t("Vehicle")}{" "}
                      <span className="text-muted-foreground">{u.r.vehicle?.plate}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{u.r.client?.full_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">{t(u.type)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(u.at)}</p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const TONE_CHIPS: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  orange: "bg-orange-50 text-orange-600",
  default: "bg-primary/10 text-primary",
};

function Stat({
  href,
  label,
  value,
  tone,
  icon: Icon,
}: {
  href: string;
  label: string;
  value: number;
  tone?: string;
  icon: LucideIcon;
}) {
  const chip = TONE_CHIPS[tone ?? "default"];
  return (
    <Link href={href} className="group">
      <Card className="h-full p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${chip}`}>
            <Icon className="h-5 w-5" />
          </span>
          <p className="text-2xl font-bold leading-none tracking-tight">{value}</p>
        </div>
        <p className="mt-3 text-xs font-medium text-muted-foreground">{label}</p>
      </Card>
    </Link>
  );
}

function RevCard({
  label,
  value,
  icon: Icon,
  emphasize,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  emphasize?: boolean;
}) {
  return (
    <Card className={`p-5 ${emphasize ? "border-primary/30 bg-primary/5" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            emphasize ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${emphasize ? "text-primary" : ""}`}>{value}</p>
    </Card>
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
