"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RANGE_PRESETS, type RangePreset } from "@/lib/date-range";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function DateFilter({ defaultPreset = "this_month" }: { defaultPreset?: RangePreset }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const range = (sp.get("range") as RangePreset) || defaultPreset;
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => update({ range: p.value })}
            className={cn(
              "h-9 rounded-md border px-3 text-sm font-medium transition-colors",
              range === p.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-white text-muted-foreground hover:bg-muted"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={from}
            onChange={(e) => update({ range: "custom", from: e.target.value })}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => update({ range: "custom", to: e.target.value })}
            className="w-auto"
          />
        </div>
      )}
    </div>
  );
}
