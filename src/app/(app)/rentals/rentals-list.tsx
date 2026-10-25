"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { RentalStatusBadge, PaymentStatusBadge } from "@/components/status-badges";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RentalStatus } from "@/lib/types";
import { useT } from "@/lib/i18n/provider";

const FILTERS: { value: RentalStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "RESERVED", label: "Reserved" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function RentalsList({ rentals, currency }: { rentals: any[]; currency: string }) {
  const t = useT();
  const [filter, setFilter] = useState<RentalStatus | "ALL">("ALL");

  const filtered = useMemo(
    () => (filter === "ALL" ? rentals : rentals.filter((r) => r.status === filter)),
    [rentals, filter]
  );

  return (
    <div className="space-y-4">
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
                : "border-input bg-white text-muted-foreground hover:bg-muted"
            )}
          >
            {t(f.label)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("No rentals in this view.")}</p>
      ) : (
        <Card className="divide-y divide-border">
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/rentals/${r.id}`}
              className="flex flex-col gap-2 p-4 hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : t("Vehicle")}{" "}
                  <span className="text-muted-foreground">{r.vehicle?.plate}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {r.client?.full_name ?? t("Client")} · {formatDate(r.pickup_at)} → {formatDate(r.return_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="mr-1 text-sm font-semibold">{formatMoney(r.total_cents, currency)}</span>
                <PaymentStatusBadge paid_cents={r.paid_cents} total_cents={r.total_cents} />
                <RentalStatusBadge status={r.status} />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
