"use client";

import { useTransition } from "react";
import { setVehicleStatus } from "../actions";
import { VEHICLE_STATUSES, VEHICLE_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { VehicleStatus } from "@/lib/types";
import { useT } from "@/lib/i18n/provider";

export function CarStatusActions({ id, current }: { id: string; current: VehicleStatus }) {
  const [pending, startTransition] = useTransition();
  const t = useT();

  return (
    <div className="flex flex-wrap gap-2">
      {VEHICLE_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending || s === current}
          onClick={() => startTransition(() => setVehicleStatus(id, s))}
          className={cn(
            "h-9 rounded-md border px-3 text-sm font-medium transition-colors disabled:opacity-60",
            s === current
              ? "border-primary bg-primary/10 text-primary"
              : "border-input bg-white text-muted-foreground hover:bg-muted"
          )}
        >
          {t(VEHICLE_STATUS_META[s].label)}
        </button>
      ))}
    </div>
  );
}
