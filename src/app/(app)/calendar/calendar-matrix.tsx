"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type CalCell =
  | { t: "blocked" }
  | { t: "free" }
  | { t: "booked"; id: string; cls: string; isStart: boolean; label: string; title: string };

export type CalRow = {
  vehicleId: string;
  name: string;
  plate: string;
  maintenance: boolean;
  cells: CalCell[];
};

export type CalDay = { key: string; dow: string; dom: string; today: boolean };

export function CalendarMatrix({
  rows,
  days,
  maintenanceLabel,
}: {
  rows: CalRow[];
  days: CalDay[];
  maintenanceLabel: string;
}) {
  const router = useRouter();
  const [sel, setSel] = useState<{ row: number; start: number; end: number } | null>(null);
  const dragging = useRef(false);

  const isFree = (row: number, col: number) => rows[row]?.cells[col]?.t === "free";

  const rangeAllFree = (row: number, a: number, b: number) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    for (let c = lo; c <= hi; c++) if (!isFree(row, c)) return false;
    return true;
  };

  const start = (row: number, col: number) => {
    if (!isFree(row, col)) return;
    dragging.current = true;
    setSel({ row, start: col, end: col });
  };
  const extend = (row: number, col: number) => {
    if (!dragging.current || !sel || sel.row !== row) return;
    if (isFree(row, col) && rangeAllFree(row, sel.start, col)) {
      setSel({ ...sel, end: col });
    }
  };
  const finish = () => {
    if (!dragging.current || !sel) return;
    dragging.current = false;
    const lo = Math.min(sel.start, sel.end);
    const hi = Math.max(sel.start, sel.end);
    const vehicle = rows[sel.row].vehicleId;
    setSel(null);
    const base = `/rentals/new?vehicle=${vehicle}&date=${days[lo].key}`;
    router.push(lo === hi ? base : `${base}&return=${days[hi].key}`);
  };

  const inSel = (row: number, col: number) =>
    sel && sel.row === row && col >= Math.min(sel.start, sel.end) && col <= Math.max(sel.start, sel.end);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card" onPointerUp={finish} onPointerLeave={() => { dragging.current = false; }}>
      <table className="w-full border-collapse select-none text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-[9rem] bg-card p-3 text-left font-medium text-muted-foreground">
              &nbsp;
            </th>
            {days.map((d) => (
              <th
                key={d.key}
                className={cn(
                  "min-w-[5.5rem] border-l border-border p-2 text-center font-medium",
                  d.today ? "bg-primary/5 text-primary" : "text-muted-foreground"
                )}
              >
                <div className="text-[11px] uppercase">{d.dow}</div>
                <div className="text-base">{d.dom}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.vehicleId} className="border-t border-border">
              <td className="sticky left-0 z-10 bg-card p-3 align-top">
                <p className="font-medium leading-tight">{row.name}</p>
                <p className="text-xs text-muted-foreground">{row.plate}</p>
                {row.maintenance && (
                  <span className="mt-1 inline-block rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                    {maintenanceLabel}
                  </span>
                )}
              </td>
              {row.cells.map((cell, ci) => {
                if (cell.t === "booked") {
                  return (
                    <td key={ci} className="border-l border-border p-1 align-middle">
                      <Link
                        href={`/rentals/${cell.id}`}
                        title={cell.title}
                        className={cn(
                          "flex h-10 items-center justify-center rounded px-1 text-center text-[11px] font-medium leading-tight",
                          cell.cls
                        )}
                      >
                        <span className="line-clamp-2">{cell.isStart ? cell.label : ""}</span>
                      </Link>
                    </td>
                  );
                }
                if (cell.t === "blocked") {
                  return (
                    <td key={ci} className="border-l border-border p-1">
                      <div
                        className="h-10 rounded"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 6px, #e2e8f0 6px, #e2e8f0 12px)",
                        }}
                      />
                    </td>
                  );
                }
                return (
                  <td key={ci} className="border-l border-border p-1">
                    <div
                      onPointerDown={(e) => { e.preventDefault(); start(ri, ci); }}
                      onPointerEnter={() => extend(ri, ci)}
                      className={cn(
                        "flex h-10 cursor-pointer items-center justify-center rounded text-primary/60",
                        inSel(ri, ci) ? "bg-primary/20" : "hover:bg-primary/5"
                      )}
                    >
                      {inSel(ri, ci) ? "" : "+"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
