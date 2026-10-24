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
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { toDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Vehicle } from "@/lib/types";

const WEEK_OPTS = { weekStartsOn: 1 as const };

function statusColor(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-blue-500 text-white";
    case "RESERVED":
      return "bg-amber-400 text-amber-950";
    default:
      return "bg-slate-300 text-slate-700";
  }
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { view?: string; start?: string };
}) {
  const view = searchParams.view === "month" ? "month" : "week";
  const anchor = searchParams.start ? new Date(searchParams.start) : new Date();

  const windowStart =
    view === "month" ? startOfMonth(anchor) : startOfWeek(anchor, WEEK_OPTS);
  const windowEnd = view === "month" ? endOfMonth(anchor) : endOfWeek(anchor, WEEK_OPTS);
  const days = eachDayOfInterval({ start: windowStart, end: windowEnd });

  const supabase = createClient();
  const [{ data: vData }, { data: rData }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("archived", false).order("make", { ascending: true }),
    // Only OPEN rentals occupy the calendar. Returned/cancelled never block a day.
    supabase
      .from("rentals")
      .select("id, vehicle_id, status, pickup_at, return_at, client:clients(full_name)")
      .in("status", ["ACTIVE", "RESERVED"])
      .lt("pickup_at", endOfDay(windowEnd).toISOString())
      .gt("return_at", startOfDay(windowStart).toISOString()),
  ]);

  const vehicles = (vData ?? []) as Vehicle[];
  const rentals = (rData ?? []) as any[];

  // Navigation targets
  const prev =
    view === "month"
      ? subMonths(windowStart, 1)
      : addDays(windowStart, -7);
  const next =
    view === "month" ? addMonths(windowStart, 1) : addDays(windowStart, 7);
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  const navHref = (d: Date) => `/calendar?view=${view}&start=${fmt(d)}`;

  const rangeLabel =
    view === "month"
      ? format(anchor, "MMMM yyyy")
      : `${format(windowStart, "d MMM")} – ${format(windowEnd, "d MMM yyyy")}`;

  function coveringRental(vehicleId: string, day: Date) {
    return rentals.find(
      (r) =>
        r.vehicle_id === vehicleId &&
        toDate(r.pickup_at) <= endOfDay(day) &&
        toDate(r.return_at) >= startOfDay(day)
    );
  }

  return (
    <div>
      <PageHeader title="Calendar" subtitle="See what's booked and what's free at a glance" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={navHref(prev)} className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-white hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[10rem] text-center text-sm font-semibold">{rangeLabel}</span>
          <Link href={navHref(next)} className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-white hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link href={`/calendar?view=${view}`} className="ml-1 flex h-9 items-center rounded-md border border-input bg-white px-3 text-sm hover:bg-muted">
            Today
          </Link>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-input bg-white p-1">
          <Link
            href="/calendar?view=week"
            className={cn("rounded px-3 py-1 text-sm font-medium", view === "week" ? "bg-primary/10 text-primary" : "text-muted-foreground")}
          >
            Week
          </Link>
          <Link
            href="/calendar?view=month"
            className={cn("rounded px-3 py-1 text-sm font-medium", view === "month" ? "bg-primary/10 text-primary" : "text-muted-foreground")}
          >
            Month
          </Link>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No cars to show"
          description="Add cars to your fleet to see them on the calendar."
          action={{ href: "/cars/new", label: "Add car" }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[9rem] bg-white p-3 text-left font-medium text-muted-foreground">
                  Vehicle
                </th>
                {days.map((d) => (
                  <th
                    key={d.toISOString()}
                    className={cn(
                      "min-w-[5.5rem] border-l border-border p-2 text-center font-medium",
                      isToday(d) ? "bg-primary/5 text-primary" : "text-muted-foreground"
                    )}
                  >
                    <div className="text-[11px] uppercase">{format(d, "EEE")}</div>
                    <div className="text-base">{format(d, "d")}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="sticky left-0 z-10 bg-white p-3 align-top">
                    <p className="font-medium leading-tight">
                      {v.make} {v.model}
                    </p>
                    <p className="text-xs text-muted-foreground">{v.plate}</p>
                  </td>
                  {days.map((d) => {
                    const rental = coveringRental(v.id, d);
                    const isStart = rental && isSameDay(toDate(rental.pickup_at), d);
                    if (rental) {
                      return (
                        <td key={d.toISOString()} className="border-l border-border p-1 align-middle">
                          <Link
                            href={`/rentals/${rental.id}`}
                            className={cn(
                              "flex h-10 items-center justify-center rounded px-1 text-center text-[11px] font-medium leading-tight",
                              statusColor(rental.status)
                            )}
                          >
                            <span className="line-clamp-2">
                              {isStart ? rental.client?.full_name ?? "Booked" : ""}
                            </span>
                          </Link>
                        </td>
                      );
                    }
                    return (
                      <td key={d.toISOString()} className="border-l border-border p-1">
                        <Link
                          href={`/rentals/new?vehicle=${v.id}&date=${fmt(d)}`}
                          className="flex h-10 items-center justify-center rounded text-muted-foreground/0 hover:bg-primary/5 hover:text-primary/60"
                        >
                          +
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <Legend className="bg-blue-500" label="Active (out)" />
        <Legend className="bg-amber-400" label="Reserved" />
      </div>
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
