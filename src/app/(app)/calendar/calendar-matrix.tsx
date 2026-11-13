"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, MoreVertical, Eye, CalendarPlus, Pencil, RotateCcw, FileText, Receipt, History, Wrench, Trash2, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { markReturned } from "../rentals/actions";
import { createMaintenanceBlock, deleteMaintenanceBlock } from "./block-actions";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/provider";

export type CalCell =
  | { t: "blocked"; blockId?: string; label?: string }
  | { t: "free" }
  | { t: "booked"; id: string; cls: string; isStart: boolean; isEnd: boolean; label: string; title: string; active: boolean };

export type CalRow = {
  vehicleId: string;
  name: string;
  plate: string;
  maintenance: boolean;
  cells: CalCell[];
};

export type CalDay = { key: string; dow: string; dom: string; today: boolean; weekend: boolean };

type BlockText = {
  title: string;
  subtitle: string;
  start: string;
  end: string;
  reason: string;
  reasonPh: string;
  save: string;
  cancel: string;
  remove: string;
  saving: string;
  removeTitle: string;
};

export function CalendarMatrix({
  rows: allRows,
  days,
  maintenanceLabel,
  filterText,
  menuText,
  blockText,
}: {
  rows: CalRow[];
  days: CalDay[];
  maintenanceLabel: string;
  filterText: { all: string; booked: string; free: string };
  menuText: {
    view: string;
    history: string;
    newRental: string;
    edit: string;
    block: string;
    viewRental: string;
    markReturned: string;
    contract: string;
    invoice: string;
  };
  blockText: BlockText;
}) {
  const router = useRouter();
  const t = useT();
  const [sel, setSel] = useState<{ row: number; start: number; end: number } | null>(null);
  const dragging = useRef(false);
  const [show, setShow] = useState<"all" | "booked" | "free">("all");
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [rmenu, setRmenu] = useState<{ id: string; vehicleId: string; active: boolean; top: number; left: number } | null>(null);
  const [bmenu, setBmenu] = useState<{ blockId: string; label?: string; top: number; left: number } | null>(null);
  const [pending, startTransition] = useTransition();

  // Maintenance-block modal
  const [blockFor, setBlockFor] = useState<{ vehicleId: string; name: string } | null>(null);
  const [bStart, setBStart] = useState("");
  const [bEnd, setBEnd] = useState("");
  const [bReason, setBReason] = useState("");
  const [bErr, setBErr] = useState<string | null>(null);

  const doReturn = (rentalId: string, vehicleId: string) => {
    const fd = new FormData();
    fd.set("rental_id", rentalId);
    fd.set("vehicle_id", vehicleId);
    setRmenu(null);
    startTransition(async () => {
      await markReturned(fd);
      toast.success(t("Marked as returned"));
      router.refresh();
    });
  };

  const openBlock = (vehicleId: string) => {
    const name = allRows.find((r) => r.vehicleId === vehicleId)?.name ?? "";
    setMenu(null);
    setBStart("");
    setBEnd("");
    setBReason("");
    setBErr(null);
    setBlockFor({ vehicleId, name });
  };

  const saveBlock = () => {
    if (!blockFor || !bStart) {
      setBErr(blockText.start);
      return;
    }
    const fd = new FormData();
    fd.set("vehicle_id", blockFor.vehicleId);
    fd.set("start_date", bStart);
    fd.set("end_date", bEnd || bStart);
    fd.set("reason", bReason);
    setBErr(null);
    startTransition(async () => {
      const r = await createMaintenanceBlock(fd);
      if (r?.error) {
        setBErr(r.error);
        return;
      }
      setBlockFor(null);
      toast.success(t("Car blocked for maintenance"));
      router.refresh();
    });
  };

  const removeBlock = (blockId: string) => {
    const fd = new FormData();
    fd.set("id", blockId);
    setBmenu(null);
    startTransition(async () => {
      await deleteMaintenanceBlock(fd);
      toast.success(t("Block removed"));
      router.refresh();
    });
  };

  const rowBooked = (r: CalRow) => r.cells.some((c) => c.t === "booked");
  const rowFree = (r: CalRow) => !r.maintenance && r.cells.every((c) => c.t !== "booked");
  const bookedCount = allRows.filter(rowBooked).length;
  const freeCount = allRows.filter(rowFree).length;
  const rows = show === "booked" ? allRows.filter(rowBooked) : show === "free" ? allRows.filter(rowFree) : allRows;

  const chips: { key: "all" | "booked" | "free"; label: string; n: number }[] = [
    { key: "all", label: filterText.all, n: allRows.length },
    { key: "booked", label: filterText.booked, n: bookedCount },
    { key: "free", label: filterText.free, n: freeCount },
  ];

  const isFree = (row: number, col: number) => rows[row]?.cells[col]?.t === "free";
  const rangeAllFree = (row: number, a: number, b: number) => {
    for (let c = Math.min(a, b); c <= Math.max(a, b); c++) if (!isFree(row, c)) return false;
    return true;
  };
  const start = (row: number, col: number) => {
    if (!isFree(row, col)) return;
    dragging.current = true;
    setSel({ row, start: col, end: col });
  };
  const extend = (row: number, col: number) => {
    if (!dragging.current || !sel || sel.row !== row) return;
    if (isFree(row, col) && rangeAllFree(row, sel.start, col)) setSel({ ...sel, end: col });
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
    <div className="space-y-3">
      <div className="inline-flex items-center gap-0.5 rounded-lg border border-input bg-card p-1 shadow-sm">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setShow(c.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              show === c.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {c.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs font-semibold tabular-nums",
                show === c.key ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {c.n}
            </span>
          </button>
        ))}
      </div>

      <div
        className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm"
        onPointerUp={finish}
        onPointerLeave={() => { dragging.current = false; }}
      >
        <table className="w-full border-separate border-spacing-0 select-none text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-[10rem] border-b border-r border-border bg-card px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Makina
              </th>
              {days.map((d) => (
                <th
                  key={d.key}
                  className={cn(
                    "min-w-[4.5rem] border-b border-border px-1 py-2 text-center font-medium",
                    d.weekend && "bg-muted/40",
                    d.today && "bg-primary/5"
                  )}
                >
                  <div className={cn("text-[10px] uppercase tracking-wide", d.today ? "text-primary" : "text-muted-foreground")}>{d.dow}</div>
                  <div className="mt-0.5 flex justify-center">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                        d.today ? "bg-primary text-primary-foreground" : "text-foreground"
                      )}
                    >
                      {d.dom}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.vehicleId} className="group">
                <td className="sticky left-0 z-10 border-b border-r border-border bg-card px-4 py-2.5 align-middle group-hover:bg-muted/40">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", row.maintenance ? "bg-orange-400" : rowBooked(row) ? "bg-blue-500" : "bg-emerald-500")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight">{row.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.plate}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Veprime"
                      onClick={(e) => {
                        const rc = e.currentTarget.getBoundingClientRect();
                        setMenu((cur) => (cur?.id === row.vehicleId ? null : { id: row.vehicleId, top: rc.bottom + 4, left: Math.max(8, rc.right - 208) }));
                      }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                  {row.maintenance && (
                    <span className="mt-1 inline-block rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">{maintenanceLabel}</span>
                  )}
                </td>

                {row.cells.map((cell, ci) => {
                  const day = days[ci];
                  const tdTint = cn(day?.weekend && "bg-muted/30", day?.today && "bg-primary/5");

                  if (cell.t === "booked") {
                    const rid = cell.id;
                    const active = cell.active;
                    return (
                      <td key={ci} className={cn("border-b border-border px-0 py-1.5", tdTint)}>
                        <button
                          type="button"
                          title={cell.title}
                          onClick={(e) => {
                            const rc = e.currentTarget.getBoundingClientRect();
                            setMenu(null);
                            setBmenu(null);
                            setRmenu((cur) =>
                              cur?.id === rid
                                ? null
                                : { id: rid, vehicleId: row.vehicleId, active, top: rc.bottom + 4, left: Math.min(rc.left, window.innerWidth - 220) }
                            );
                          }}
                          className={cn(
                            "flex h-8 w-full items-center px-2 text-[11px] font-semibold leading-tight shadow-sm transition-opacity hover:opacity-90",
                            cell.cls,
                            cell.isStart && "ml-1 rounded-l-lg",
                            cell.isEnd && "mr-1 rounded-r-lg"
                          )}
                        >
                          <span className="truncate">{cell.isStart ? cell.label : ""}</span>
                        </button>
                      </td>
                    );
                  }

                  if (cell.t === "blocked") {
                    const removable = !!cell.blockId;
                    const stripe = { backgroundImage: "repeating-linear-gradient(45deg,#fed7aa,#fed7aa 6px,#fdba74 6px,#fdba74 12px)" };
                    return (
                      <td key={ci} className={cn("border-b border-l border-border/40 px-1 py-1.5", tdTint)}>
                        {removable ? (
                          <button
                            type="button"
                            title={cell.label || blockText.removeTitle}
                            onClick={(e) => {
                              const rc = e.currentTarget.getBoundingClientRect();
                              setMenu(null);
                              setRmenu(null);
                              setBmenu((cur) =>
                                cur?.blockId === cell.blockId
                                  ? null
                                  : { blockId: cell.blockId!, label: cell.label, top: rc.bottom + 4, left: Math.min(rc.left, window.innerWidth - 220) }
                              );
                            }}
                            className="flex h-8 w-full items-center justify-center rounded-md shadow-sm transition-opacity hover:opacity-80"
                            style={stripe}
                          >
                            <Wrench className="h-3.5 w-3.5 text-orange-700/70" />
                          </button>
                        ) : (
                          <div className="h-8 rounded-md" style={{ backgroundImage: "repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 6px,#e2e8f0 6px,#e2e8f0 12px)" }} />
                        )}
                      </td>
                    );
                  }

                  return (
                    <td key={ci} className={cn("border-b border-l border-border/40 px-1 py-1.5", tdTint)}>
                      <div
                        onPointerDown={(e) => { e.preventDefault(); start(ri, ci); }}
                        onPointerEnter={() => extend(ri, ci)}
                        className={cn(
                          "flex h-8 cursor-pointer items-center justify-center rounded-md transition-colors",
                          inSel(ri, ci) ? "bg-primary/25 text-primary" : "text-transparent hover:bg-primary/5 hover:text-primary/50"
                        )}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 w-52 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-xl"
            style={{ top: menu.top, left: menu.left }}
          >
            <Link href={`/cars/${menu.id}`} onClick={() => setMenu(null)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted">
              <Eye className="h-4 w-4 text-muted-foreground" /> {menuText.view}
            </Link>
            <Link href={`/rentals?car=${menu.id}`} onClick={() => setMenu(null)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted">
              <History className="h-4 w-4 text-muted-foreground" /> {menuText.history}
            </Link>
            <Link href={`/rentals/new?vehicle=${menu.id}`} onClick={() => setMenu(null)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted">
              <CalendarPlus className="h-4 w-4 text-muted-foreground" /> {menuText.newRental}
            </Link>
            <Link href={`/cars/${menu.id}/edit`} onClick={() => setMenu(null)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted">
              <Pencil className="h-4 w-4 text-muted-foreground" /> {menuText.edit}
            </Link>
            <button
              type="button"
              onClick={() => openBlock(menu.id)}
              className="flex w-full items-center gap-2.5 border-t border-border px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <Wrench className="h-4 w-4 text-muted-foreground" /> {menuText.block}
            </button>
          </div>
        </>
      )}

      {rmenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setRmenu(null)} />
          <div
            className="fixed z-50 w-52 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-xl"
            style={{ top: rmenu.top, left: rmenu.left }}
          >
            <Link href={`/rentals/${rmenu.id}`} onClick={() => setRmenu(null)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted">
              <Eye className="h-4 w-4 text-muted-foreground" /> {menuText.viewRental}
            </Link>
            {rmenu.active && (
              <button
                type="button"
                disabled={pending}
                onClick={() => doReturn(rmenu.id, rmenu.vehicleId)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4 text-muted-foreground" /> {menuText.markReturned}
              </button>
            )}
            <Link href={`/contract/${rmenu.id}`} onClick={() => setRmenu(null)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted">
              <FileText className="h-4 w-4 text-muted-foreground" /> {menuText.contract}
            </Link>
            <Link href={`/invoice/${rmenu.id}`} onClick={() => setRmenu(null)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted">
              <Receipt className="h-4 w-4 text-muted-foreground" /> {menuText.invoice}
            </Link>
          </div>
        </>
      )}

      {bmenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setBmenu(null)} />
          <div
            className="fixed z-50 w-56 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-xl"
            style={{ top: bmenu.top, left: bmenu.left }}
          >
            {bmenu.label && (
              <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                {blockText.removeTitle}: <span className="font-medium text-foreground">{bmenu.label}</span>
              </p>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => removeBlock(bmenu.blockId)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-rose-600 hover:bg-muted disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> {blockText.remove}
            </button>
          </div>
        </>
      )}

      {blockFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setBlockFor(null)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                  <Wrench className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold leading-tight">{blockText.title}</h3>
                  <p className="text-xs text-muted-foreground">{blockFor.name}</p>
                </div>
              </div>
              <button type="button" onClick={() => setBlockFor(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-xs text-muted-foreground">{blockText.subtitle}</p>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{blockText.start}</label>
                <input
                  type="date"
                  value={bStart}
                  onChange={(e) => setBStart(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-card px-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{blockText.end}</label>
                <input
                  type="date"
                  value={bEnd}
                  min={bStart || undefined}
                  onChange={(e) => setBEnd(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-card px-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <label className="mb-1 block text-xs font-medium text-muted-foreground">{blockText.reason}</label>
            <input
              type="text"
              value={bReason}
              onChange={(e) => setBReason(e.target.value)}
              placeholder={blockText.reasonPh}
              className="mb-3 h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-primary"
            />

            {bErr && <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{bErr}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBlockFor(null)}
                className="h-9 rounded-md border border-input bg-card px-3.5 text-sm font-medium hover:bg-muted"
              >
                {blockText.cancel}
              </button>
              <button
                type="button"
                onClick={saveBlock}
                disabled={pending}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                {pending ? blockText.saving : blockText.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
