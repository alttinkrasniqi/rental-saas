import Link from "next/link";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";
import {
  ArrowDownLeft, ArrowUpRight, AlertTriangle, Wallet, BellRing, Wrench,
  CheckCircle2, ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { formatMoney, formatDate, formatTime, toDate, remainingCents, effectiveStatus } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { TFunc } from "@/lib/i18n";
import type { Vehicle } from "@/lib/types";

export const dynamic = "force-dynamic";

const SQ_WD = ["E diel", "E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë"];

export default async function TodayPage() {
  const t = getT();
  const business = await getBusiness();
  const currency = business?.currency ?? "EUR";
  const supabase = createClient();
  const now = new Date();
  const todayItv = { start: startOfDay(now), end: endOfDay(now) };
  const today0 = startOfDay(now);

  const [{ data: vData }, { data: rData }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("archived", false),
    supabase
      .from("rentals")
      .select("id, vehicle_id, status, open_ended, source, approved, pickup_at, return_at, total_cents, paid_cents, vehicle:vehicles(make, model, plate), client:clients(full_name, phone)")
      .neq("status", "CANCELLED"),
  ]);
  const vehicles = (vData ?? []) as Vehicle[];
  const rentals = (rData ?? []) as any[];
  const eff = (r: any) => effectiveStatus(r, now);

  // --- The day's operational buckets ---
  const pickupsToday = rentals
    .filter((r) => r.approved !== false && (r.status === "RESERVED" || r.status === "ACTIVE") && isWithinInterval(toDate(r.pickup_at), todayItv))
    .sort((a, b) => toDate(a.pickup_at).getTime() - toDate(b.pickup_at).getTime());

  const overdue = rentals
    .filter((r) => eff(r) === "ACTIVE" && !r.open_ended && toDate(r.return_at) < today0)
    .sort((a, b) => toDate(a.return_at).getTime() - toDate(b.return_at).getTime());

  const returnsToday = rentals
    .filter((r) => eff(r) === "ACTIVE" && !r.open_ended && isWithinInterval(toDate(r.return_at), todayItv))
    .sort((a, b) => toDate(a.return_at).getTime() - toDate(b.return_at).getTime());

  const requests = rentals
    .filter((r) => r.source === "online" && r.approved === false)
    .sort((a, b) => toDate(a.pickup_at).getTime() - toDate(b.pickup_at).getTime());

  const unpaid = rentals
    .filter((r) => (eff(r) === "ACTIVE" || eff(r) === "RESERVED") && remainingCents(r) > 0)
    .sort((a, b) => remainingCents(b) - remainingCents(a));

  // Compliance / service dates within 30 days or already past.
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
        if (days > 30) return null;
        return { vehicleId: v.id, name: `${v.make} ${v.model}`, plate: v.plate, item: it.label, date: ds, days, overdue: days < 0 };
      })
    )
    .filter(Boolean)
    .sort((a: any, b: any) => a.days - b.days) as any[];

  const totalItems =
    pickupsToday.length + overdue.length + returnsToday.length + requests.length + unpaid.length + reminders.length;

  const niceDate = `${SQ_WD[now.getDay()]}, ${formatDate(now)}`;

  const chips: { label: string; n: number; href: string; tone: string }[] = [
    { label: t("Pickups"), n: pickupsToday.length, href: "#pickups", tone: "text-primary" },
    { label: t("Returns"), n: returnsToday.length, href: "#returns", tone: "text-blue-600" },
    { label: t("Overdue"), n: overdue.length, href: "#overdue", tone: "text-rose-600" },
    { label: t("Requests"), n: requests.length, href: "#requests", tone: "text-violet-600" },
    { label: t("Unpaid"), n: unpaid.length, href: "#unpaid", tone: "text-amber-600" },
  ];

  return (
    <div>
      <PageHeader title={t("Today")} subtitle={niceDate} />

      {/* Count chips — a glance at the whole day */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {chips.map((c) => (
          <a
            key={c.label}
            href={c.href}
            className="rounded-2xl border border-border bg-card p-3.5 shadow-sm transition hover:shadow-md"
          >
            <p className={`text-2xl font-extrabold leading-none ${c.n > 0 ? c.tone : "text-muted-foreground/50"}`}>{c.n}</p>
            <p className="mt-1.5 text-xs font-medium text-muted-foreground">{c.label}</p>
          </a>
        ))}
      </div>

      {totalItems === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <p className="text-base font-semibold">{t("All clear for today")}</p>
            <p className="max-w-xs text-sm text-muted-foreground">{t("No pickups, returns, overdue cars or pending requests right now.")}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-5">
        {/* Overdue first — most urgent */}
        <Section id="overdue" show={overdue.length > 0} icon={AlertTriangle} tone="rose" title={t("Overdue")} count={overdue.length}>
          {overdue.map((r) => (
            <OpRow
              key={r.id}
              href={`/rentals/${r.id}`}
              title={r.client?.full_name ?? t("Booked")}
              sub={carLabel(r, t)}
              right={t(Math.abs(daysDiff(r.return_at, now)) === 1 ? "{n} day overdue" : "{n} days overdue", { n: Math.abs(daysDiff(r.return_at, now)) })}
              rightTone="text-rose-600"
            />
          ))}
        </Section>

        {/* Pickups today */}
        <Section id="pickups" show={pickupsToday.length > 0} icon={ArrowUpRight} tone="primary" title={t("Pickups today")} count={pickupsToday.length}>
          {pickupsToday.map((r) => (
            <OpRow
              key={r.id}
              href={`/rentals/${r.id}`}
              title={r.client?.full_name ?? t("Booked")}
              sub={carLabel(r, t)}
              right={formatTime(r.pickup_at)}
            />
          ))}
        </Section>

        {/* Returns due today */}
        <Section id="returns" show={returnsToday.length > 0} icon={ArrowDownLeft} tone="blue" title={t("Returns due today")} count={returnsToday.length}>
          {returnsToday.map((r) => (
            <OpRow
              key={r.id}
              href={`/rentals/${r.id}`}
              title={r.client?.full_name ?? t("Booked")}
              sub={carLabel(r, t)}
              right={formatTime(r.return_at)}
            />
          ))}
        </Section>

        {/* New online requests */}
        <Section id="requests" show={requests.length > 0} icon={BellRing} tone="violet" title={t("New requests")} count={requests.length}>
          {requests.map((r) => (
            <OpRow
              key={r.id}
              href="/requests"
              title={r.client?.full_name ?? t("Online request")}
              sub={`${carLabel(r, t)} · ${formatDate(r.pickup_at)}`}
              right={t("Review")}
              rightTone="text-violet-600"
            />
          ))}
        </Section>

        {/* Unpaid open rentals */}
        <Section id="unpaid" show={unpaid.length > 0} icon={Wallet} tone="amber" title={t("Awaiting payment")} count={unpaid.length}>
          {unpaid.map((r) => (
            <OpRow
              key={r.id}
              href={`/rentals/${r.id}`}
              title={r.client?.full_name ?? t("Booked")}
              sub={carLabel(r, t)}
              right={formatMoney(remainingCents(r), currency)}
              rightTone="text-amber-600"
            />
          ))}
        </Section>

        {/* Compliance / maintenance due */}
        <Section id="maintenance" show={reminders.length > 0} icon={Wrench} tone="orange" title={t("Maintenance due")} count={reminders.length}>
          {reminders.slice(0, 10).map((rm, i) => (
            <OpRow
              key={i}
              href={`/cars/${rm.vehicleId}/edit`}
              title={`${rm.name}`}
              sub={`${rm.item}${rm.plate ? ` · ${rm.plate}` : ""}`}
              right={rm.overdue ? t("expired") : formatDate(rm.date)}
              rightTone={rm.overdue ? "text-rose-600" : "text-orange-600"}
            />
          ))}
        </Section>
      </div>
    </div>
  );
}

// ---------- helpers ----------

function carLabel(r: any, t: TFunc): string {
  if (!r.vehicle) return t("Car removed");
  const plate = r.vehicle.plate ? ` · ${r.vehicle.plate}` : "";
  return `${r.vehicle.make} ${r.vehicle.model}${plate}`;
}

function daysDiff(dateStr: string, now: Date): number {
  return Math.round((startOfDay(toDate(dateStr)).getTime() - startOfDay(now).getTime()) / 86400000);
}

const TONES: Record<string, { head: string; chip: string; ring: string }> = {
  rose: { head: "text-rose-700", chip: "bg-rose-100 text-rose-700", ring: "border-rose-200" },
  primary: { head: "text-primary", chip: "bg-primary/10 text-primary", ring: "border-border" },
  blue: { head: "text-blue-700", chip: "bg-blue-100 text-blue-700", ring: "border-border" },
  violet: { head: "text-violet-700", chip: "bg-violet-100 text-violet-700", ring: "border-border" },
  amber: { head: "text-amber-700", chip: "bg-amber-100 text-amber-700", ring: "border-border" },
  orange: { head: "text-orange-700", chip: "bg-orange-100 text-orange-700", ring: "border-border" },
};

function Section({
  id, show, icon: Icon, tone, title, count, children,
}: {
  id: string;
  show: boolean;
  icon: LucideIcon;
  tone: keyof typeof TONES | string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (!show) return null;
  const c = TONES[tone] ?? TONES.primary;
  return (
    <Card id={id} className={`scroll-mt-4 rounded-2xl ${c.ring}`}>
      <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3.5">
        <span className={`flex items-center gap-2 text-sm font-semibold ${c.head}`}>
          <Icon className="h-4 w-4" /> {title}
        </span>
        <span className={`ml-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${c.chip}`}>{count}</span>
      </div>
      <CardContent className="space-y-2 p-3">{children}</CardContent>
    </Card>
  );
}

function OpRow({
  href, title, sub, right, rightTone,
}: {
  href: string;
  title: string;
  sub: string;
  right: string;
  rightTone?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className={`text-sm font-semibold ${rightTone ?? "text-muted-foreground"}`}>{right}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
      </div>
    </Link>
  );
}
