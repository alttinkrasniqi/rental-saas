import Link from "next/link";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ClipboardList } from "lucide-react";
import { RentalsList } from "./rentals-list";
import { toDate, remainingCents } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { RentalStatus } from "@/lib/types";

const WEEK_OPTS = { weekStartsOn: 1 as const };
const STATUSES = ["ACTIVE", "RESERVED", "COMPLETED", "CANCELLED"];

export default async function RentalsPage({
  searchParams,
}: {
  searchParams: { status?: string; paid?: string; paid_from?: string; paid_to?: string; unpaid?: string; overdue?: string };
}) {
  const t = getT();
  const business = await getBusiness();
  const supabase = createClient();
  const now = new Date();

  const { data } = await supabase
    .from("rentals")
    .select("*, vehicle:vehicles(make, model, plate), client:clients(full_name)")
    .order("pickup_at", { ascending: false });

  let rentals = (data ?? []) as any[];

  // ---- Drill-down filters (from dashboard cards) ----
  let banner: string | null = null;

  // Collected in a period → rentals that received a payment in that range.
  const paidRange = (() => {
    if (searchParams.paid === "today") return { start: startOfDay(now), end: endOfDay(now), label: t("today") };
    if (searchParams.paid === "this_week")
      return { start: startOfWeek(now, WEEK_OPTS), end: endOfWeek(now, WEEK_OPTS), label: t("this week") };
    if (searchParams.paid === "this_month")
      return { start: startOfMonth(now), end: endOfMonth(now), label: t("this month") };
    if (searchParams.paid_from && searchParams.paid_to) {
      const s = new Date(`${searchParams.paid_from}T00:00:00`);
      const e = new Date(`${searchParams.paid_to}T23:59:59`);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) return { start: s, end: e, label: null };
    }
    return null;
  })();

  if (paidRange) {
    const { data: pays } = await supabase
      .from("payments")
      .select("rental_id, paid_at")
      .gte("paid_at", paidRange.start.toISOString())
      .lte("paid_at", paidRange.end.toISOString());
    const ids = new Set((pays ?? []).map((p: any) => p.rental_id));
    rentals = rentals.filter((r) => ids.has(r.id));
    banner = paidRange.label ? t("Paid {range}", { range: paidRange.label }) : t("Paid in the selected range");
  } else if (searchParams.unpaid === "1") {
    rentals = rentals.filter(
      (r) => (r.status === "ACTIVE" || r.status === "RESERVED") && remainingCents(r) > 0
    );
    banner = t("With a balance to collect");
  } else if (searchParams.overdue === "1") {
    rentals = rentals.filter((r) => r.status === "ACTIVE" && !r.open_ended && toDate(r.return_at) < now);
    banner = t("Overdue");
  }

  const initialFilter = STATUSES.includes(searchParams.status || "")
    ? (searchParams.status as RentalStatus)
    : undefined;

  return (
    <div>
      <PageHeader
        title={t("Rentals")}
        subtitle={t("{n} total", { n: rentals.length })}
        action={{ href: "/rentals/new", label: t("New rental") }}
      />

      {banner && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <span className="font-medium text-primary">{t("Filtered: {filter}", { filter: banner })}</span>
          <Link href="/rentals" className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" /> {t("Clear")}
          </Link>
        </div>
      )}

      {rentals.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={banner ? t("Nothing matches this filter") : t("No rentals yet")}
          description={
            banner
              ? t("Try clearing the filter to see all rentals.")
              : t("Create your first rental to see it here and on your calendar.")
          }
          action={banner ? { href: "/rentals", label: t("Clear filter") } : { href: "/rentals/new", label: t("New rental") }}
        />
      ) : (
        <RentalsList rentals={rentals} currency={business?.currency ?? "EUR"} initialFilter={initialFilter} />
      )}
    </div>
  );
}
