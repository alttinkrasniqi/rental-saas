"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { VehicleStatusBadge } from "@/components/status-badges";
import { formatMoney } from "@/lib/format";
import { VEHICLE_STATUSES, VEHICLE_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Vehicle, VehicleStatus } from "@/lib/types";

export function CarsList({ vehicles, currency }: { vehicles: Vehicle[]; currency: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<VehicleStatus | "ALL">("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (status !== "ALL" && v.status !== status) return false;
      if (!q) return true;
      return (
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.plate.toLowerCase().includes(q)
      );
    });
  }, [vehicles, query, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search make, model or plate"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={status === "ALL"} onClick={() => setStatus("ALL")}>
            All
          </FilterChip>
          {VEHICLE_STATUSES.map((s) => (
            <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
              {VEHICLE_STATUS_META[s].label}
            </FilterChip>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No cars match your search.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <Link key={v.id} href={`/cars/${v.id}`}>
              <Card className="h-full p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {v.make} {v.model}
                    </p>
                    <p className="text-sm text-muted-foreground">{v.plate}</p>
                  </div>
                  <VehicleStatusBadge status={v.status} />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <span className="text-lg font-semibold">
                    {formatMoney(v.daily_price_cents, currency)}
                    <span className="text-sm font-normal text-muted-foreground">/day</span>
                  </span>
                  {v.mileage != null && (
                    <span className="text-xs text-muted-foreground">
                      {v.mileage.toLocaleString()} km
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-md border px-3 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-input bg-white text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
