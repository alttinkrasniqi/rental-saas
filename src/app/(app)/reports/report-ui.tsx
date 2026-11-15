import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Shared presentational bits for the report pages. Server-safe (no hooks).

export function StatTile({
  icon: Icon,
  tone,
  label,
  value,
  small,
  valueCls,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: string;
  small?: boolean;
  valueCls?: string;
}) {
  return (
    <Card className="rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tone)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn("mt-3 font-extrabold leading-none tracking-tight", small ? "truncate text-lg" : "text-[22px]", valueCls ?? "text-foreground")}>
        {value}
      </p>
    </Card>
  );
}

// Simple vertical bar chart. `data` is pre-bucketed; `caption` per bar is shown
// on hover (e.g. the formatted money value).
export function BarChart({ data }: { data: { label: string; value: number; caption?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-44 items-end gap-1.5">
      {data.map((d, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2" title={d.caption ?? String(d.value)}>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-primary/80 to-primary transition-all hover:opacity-90"
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          </div>
          <span className="w-full truncate text-center text-[10.5px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
