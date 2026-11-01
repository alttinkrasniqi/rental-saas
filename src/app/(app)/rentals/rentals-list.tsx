"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RentalStatusBadge, PaymentStatusBadge } from "@/components/status-badges";
import { formatMoney, formatDate, remainingCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RentalStatus } from "@/lib/types";
import { useT } from "@/lib/i18n/provider";

type FilterValue = RentalStatus | "ALL" | "OVERDUE";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "RESERVED", label: "Reserved" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function RentalsList({
  rentals,
  currency,
  initialFilter,
}: {
  rentals: any[];
  currency: string;
  initialFilter?: FilterValue;
}) {
  const t = useT();
  const [filter, setFilter] = useState<FilterValue>(initialFilter ?? "ALL");
  const [query, setQuery] = useState("");
  const now = Date.now();

  const isOverdue = (r: any) =>
    r.status === "ACTIVE" && !r.open_ended && new Date(r.return_at).getTime() < now;

  // Search first (by car, plate, client), so the chip counts match what's shown.
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rentals;
    return rentals.filter((r) => {
      const hay = [
        r.vehicle?.make,
        r.vehicle?.model,
        r.vehicle?.plate,
        r.client?.full_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rentals, query]);

  const counts = useMemo(() => {
    const c: Record<FilterValue, number> = {
      ALL: searched.length,
      ACTIVE: 0,
      OVERDUE: 0,
      RESERVED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const r of searched) {
      if (r.status in c) c[r.status as FilterValue]++;
      if (isOverdue(r)) c.OVERDUE++;
    }
    return c;
  }, [searched]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return searched;
    if (filter === "OVERDUE") return searched.filter(isOverdue);
    return searched.filter((r) => r.status === filter);
  }, [searched, filter]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search by car, plate or client…")}
          className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "h-9 rounded-md border px-3 text-sm font-medium transition-colors",
              filter === f.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {t(f.label)}{" "}
            <span className={cn("ml-0.5", f.value === "OVERDUE" && counts.OVERDUE > 0 && filter !== f.value && "text-rose-600")}>
              ({counts[f.value]})
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("No rentals in this view.")}</p>
      ) : (
        <Card className="divide-y divide-border">
          {filtered.map((r) => {
            const overdue = isOverdue(r);
            const remaining = remainingCents(r);
            return (
              <Link
                key={r.id}
                href={`/rentals/${r.id}`}
                className={cn(
                  "flex flex-col gap-2 p-4 hover:bg-muted sm:flex-row sm:items-center sm:justify-between",
                  overdue && "border-l-2 border-rose-500"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : t("Vehicle")}{" "}
                    <span className="text-muted-foreground">{r.vehicle?.plate}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {r.client?.full_name ?? t("Client")} · {formatDate(r.pickup_at)} →{" "}
                    {r.open_ended && r.status === "ACTIVE" ? t("open") : formatDate(r.return_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-sm font-semibold">{formatMoney(r.total_cents, currency)}</div>
                    {remaining > 0 && (
                      <div className="text-xs text-rose-600">
                        {t("{amount} left", { amount: formatMoney(remaining, currency) })}
                      </div>
                    )}
                  </div>
                  {overdue && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                      {t("Overdue")}
                    </span>
                  )}
                  <PaymentStatusBadge paid_cents={r.paid_cents} total_cents={r.total_cents} />
                  <RentalStatusBadge status={r.status} />
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
