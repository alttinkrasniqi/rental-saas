"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  X,
  MoreVertical,
  Eye,
  CalendarPlus,
  Pencil,
  History,
  Fuel,
  Users,
  Cog,
  Calendar,
  Gauge,
  LayoutGrid,
  List as ListIcon,
  Car as CarIcon,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { VehicleStatusBadge } from "@/components/status-badges";
import { formatMoney } from "@/lib/format";
import { VEHICLE_STATUSES, VEHICLE_STATUS_META, TRANSMISSIONS, FUEL_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import { useT } from "@/lib/i18n/provider";

type StatusFilter = VehicleStatus | "ALL";
type Sort = "name" | "price_asc" | "price_desc" | "year_desc";

export function CarsList({
  vehicles,
  currency,
  initialStatus,
}: {
  vehicles: Vehicle[];
  currency: string;
  initialStatus?: StatusFilter;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>(initialStatus ?? "ALL");
  const [panelOpen, setPanelOpen] = useState(false);
  const [make, setMake] = useState("");
  const [transmission, setTransmission] = useState("");
  const [fuel, setFuel] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [shown, setShown] = useState(false);

  const openCar = (v: Vehicle) => { setMenu(null); setSelected(v); requestAnimationFrame(() => setShown(true)); };
  const closeCar = () => { setShown(false); setTimeout(() => setSelected(null), 200); };

  useEffect(() => {
    try {
      const v = localStorage.getItem("carsView");
      if (v === "grid" || v === "list") setView(v);
    } catch {}
  }, []);
  const changeView = (v: "grid" | "list") => {
    setView(v);
    try { localStorage.setItem("carsView", v); } catch {}
  };

  const makes = useMemo(
    () => [...new Set(vehicles.map((v) => v.make).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [vehicles]
  );

  const activeAdvanced = (make ? 1 : 0) + (transmission ? 1 : 0) + (fuel ? 1 : 0);

  // search + advanced (make / transmission / fuel) → pool; status counts come from this.
  const pool = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (q && !`${v.make} ${v.model} ${v.plate}`.toLowerCase().includes(q)) return false;
      if (make && v.make !== make) return false;
      if (transmission && v.transmission !== transmission) return false;
      if (fuel && v.fuel_type !== fuel) return false;
      return true;
    });
  }, [vehicles, query, make, transmission, fuel]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { ALL: pool.length, AVAILABLE: 0, RENTED: 0, RESERVED: 0, MAINTENANCE: 0, UNAVAILABLE: 0 };
    for (const v of pool) if (v.status in c) c[v.status as StatusFilter]++;
    return c;
  }, [pool]);

  const filtered = useMemo(() => {
    const list = status === "ALL" ? pool : pool.filter((v) => v.status === status);
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "price_asc") return a.daily_price_cents - b.daily_price_cents;
      if (sort === "price_desc") return b.daily_price_cents - a.daily_price_cents;
      if (sort === "year_desc") return (b.year ?? 0) - (a.year ?? 0);
      return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
    });
    return sorted;
  }, [pool, status, sort]);

  const chips: { key: StatusFilter; label: string; dot?: string }[] = [
    { key: "ALL", label: t("All") },
    ...VEHICLE_STATUSES.map((s) => ({ key: s as StatusFilter, label: t(VEHICLE_STATUS_META[s].label), dot: VEHICLE_STATUS_META[s].dot })),
  ];

  const clearAdvanced = () => { setMake(""); setTransmission(""); setFuel(""); };

  const openMenu = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rc = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu((cur) => (cur?.id === id ? null : { id, top: rc.bottom + 4, left: Math.min(rc.left, window.innerWidth - 224) }));
  };

  return (
    <div className="space-y-4">
      {/* Search + filters button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search make, model or plate")}
            className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
            panelOpen || activeAdvanced > 0 ? "border-primary bg-primary/10 text-primary" : "border-input bg-card hover:bg-muted"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t("Filters")}
          {activeAdvanced > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{activeAdvanced}</span>
          )}
        </button>
      </div>

      {panelOpen && (
        <Card className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("Make")}</label>
            <select value={make} onChange={(e) => setMake(e.target.value)} className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm outline-none focus:border-primary">
              <option value="">{t("All makes")}</option>
              {makes.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("Transmission")}</label>
            <select value={transmission} onChange={(e) => setTransmission(e.target.value)} className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm outline-none focus:border-primary">
              <option value="">{t("All")}</option>
              {TRANSMISSIONS.map((x) => <option key={x} value={x}>{t(x)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("Fuel")}</label>
            <select value={fuel} onChange={(e) => setFuel(e.target.value)} className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm outline-none focus:border-primary">
              <option value="">{t("All")}</option>
              {FUEL_TYPES.map((x) => <option key={x} value={x}>{t(x)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("Sort by")}</label>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm outline-none focus:border-primary">
              <option value="name">{t("Name")}</option>
              <option value="price_asc">{t("Price: low to high")}</option>
              <option value="price_desc">{t("Price: high to low")}</option>
              <option value="year_desc">{t("Newest")}</option>
            </select>
          </div>
          {activeAdvanced > 0 && (
            <div className="sm:col-span-2 lg:col-span-4">
              <button type="button" onClick={clearAdvanced} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" /> {t("Clear all")}
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Status segmented control + view toggle */}
      <div className="flex items-start justify-between gap-3">
      <div className="-mx-1 flex-1 overflow-x-auto px-1 pb-1">
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-input bg-card p-1 shadow-sm">
          {chips.map((c) => {
            const on = status === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setStatus(c.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {c.dot && <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />}
                {c.label}
                <span className={cn("rounded-full px-1.5 text-xs font-semibold tabular-nums", on ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {counts[c.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
        <div className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-input bg-card p-1 shadow-sm">
          <button type="button" onClick={() => changeView("grid")} aria-label={t("Grid")} className={cn("flex h-7 w-7 items-center justify-center rounded-md transition-colors", view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => changeView("list")} aria-label={t("List")} className={cn("flex h-7 w-7 items-center justify-center rounded-md transition-colors", view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("No cars match your search.")}</p>
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v) => {
            const meta = VEHICLE_STATUS_META[v.status];
            const cover = v.photos?.[0];
            const specCls = cover ? "bg-white/15 text-white" : undefined;
            return (
              <div
                key={v.id}
                className={cn(
                  "group relative flex min-h-[172px] flex-col overflow-hidden rounded-xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                  cover ? "border-transparent" : "border-border bg-card"
                )}
              >
                {cover && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: v.cover_position || "50% 50%" }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/45" />
                  </>
                )}
                <span className={cn("absolute inset-x-0 top-0 z-20 h-1", meta.dot)} />
                <button
                  type="button"
                  aria-label={t("Actions")}
                  onClick={(e) => openMenu(v.id, e)}
                  className={cn(
                    "absolute right-2.5 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                    cover ? "text-white/90 hover:bg-white/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                <Link href={`/cars/${v.id}`} onClick={(e) => { e.preventDefault(); openCar(v); }} className="relative z-10 flex flex-1 flex-col p-4 pt-5">
                  <div className="flex items-start gap-2 pr-7">
                    <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", meta.dot)} />
                    <div className="min-w-0">
                      <p className={cn("truncate font-semibold leading-tight", cover && "text-white")}>{v.make} {v.model}</p>
                      <p className={cn("truncate text-xs", cover ? "text-white/70" : "text-muted-foreground")}>{v.plate}</p>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <VehicleStatusBadge status={v.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {v.year != null && <Spec icon={Calendar} className={specCls}>{v.year}</Spec>}
                    {v.transmission && <Spec icon={Cog} className={specCls}>{t(v.transmission)}</Spec>}
                    {v.fuel_type && <Spec icon={Fuel} className={specCls}>{t(v.fuel_type)}</Spec>}
                    {v.seats != null && <Spec icon={Users} className={specCls}>{t("{n} seats", { n: v.seats })}</Spec>}
                  </div>

                  <div className="mt-auto flex items-end justify-between pt-4">
                    <span className={cn("text-lg font-bold", cover && "text-white")}>
                      {formatMoney(v.daily_price_cents, currency)}
                      <span className={cn("text-sm font-normal", cover ? "text-white/70" : "text-muted-foreground")}>{t("/day")}</span>
                    </span>
                    {v.mileage != null && (
                      <span className={cn("inline-flex items-center gap-1 text-xs", cover ? "text-white/70" : "text-muted-foreground")}>
                        <Gauge className="h-3.5 w-3.5" /> {v.mileage.toLocaleString()} km
                      </span>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="divide-y divide-border">
            {filtered.map((v) => {
              const meta = VEHICLE_STATUS_META[v.status];
              const cover = v.photos?.[0];
              return (
                <div key={v.id} className="group relative flex items-center gap-3 p-3 pr-12 transition-colors hover:bg-muted/50">
                  <Link href={`/cars/${v.id}`} onClick={(e) => { e.preventDefault(); openCar(v); }} className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" className="h-full w-full object-cover" style={{ objectPosition: v.cover_position || "50% 50%" }} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground"><CarIcon className="h-5 w-5" /></div>
                      )}
                      <span className={cn("absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full ring-2 ring-card", meta.dot)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold leading-tight">{v.make} {v.model}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span className="text-xs text-muted-foreground">{v.plate}</span>
                        <VehicleStatusBadge status={v.status} />
                        {v.year != null && <Spec icon={Calendar}>{v.year}</Spec>}
                        {v.transmission && <Spec icon={Cog} className="hidden sm:inline-flex">{t(v.transmission)}</Spec>}
                        {v.fuel_type && <Spec icon={Fuel} className="hidden sm:inline-flex">{t(v.fuel_type)}</Spec>}
                        {v.seats != null && <Spec icon={Users} className="hidden md:inline-flex">{t("{n} seats", { n: v.seats })}</Spec>}
                      </div>
                    </div>
                    <div className="shrink-0 pl-2 text-right">
                      <div className="font-bold">
                        {formatMoney(v.daily_price_cents, currency)}
                        <span className="text-xs font-normal text-muted-foreground">{t("/day")}</span>
                      </div>
                      {v.mileage != null && <div className="text-xs text-muted-foreground">{v.mileage.toLocaleString()} km</div>}
                    </div>
                  </Link>
                  <button
                    type="button"
                    aria-label={t("Actions")}
                    onClick={(e) => openMenu(v.id, e)}
                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div className="fixed z-50 w-52 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-xl" style={{ top: menu.top, left: menu.left }}>
            <Link href={`/cars/${menu.id}`} onClick={() => setMenu(null)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted">
              <Eye className="h-4 w-4 text-muted-foreground" /> {t("View car")}
            </Link>
            <Link href={`/cars/${menu.id}/edit`} onClick={() => setMenu(null)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted">
              <Pencil className="h-4 w-4 text-muted-foreground" /> {t("Edit car")}
            </Link>
            <Link href={`/rentals/new?vehicle=${menu.id}`} onClick={() => setMenu(null)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted">
              <CalendarPlus className="h-4 w-4 text-muted-foreground" /> {t("New rental")}
            </Link>
            <Link href={`/rentals?car=${menu.id}`} onClick={() => setMenu(null)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted">
              <History className="h-4 w-4 text-muted-foreground" /> {t("Rental history")}
            </Link>
          </div>
        </>
      )}

      {/* Car quick-view drawer */}
      {selected && (
        <>
          <div onClick={closeCar} className={cn("fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300", shown ? "opacity-100" : "opacity-0")} />
          <aside className={cn(
            "fixed inset-y-2 right-2 z-50 flex w-[calc(100%-1rem)] max-w-md transform flex-col overflow-hidden rounded-3xl bg-card shadow-2xl ring-1 ring-black/5 transition-transform duration-300 ease-out sm:inset-y-4 sm:right-4",
            shown ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]"
          )}>
            <div className="relative h-52 shrink-0 bg-muted">
              {selected.photos?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.photos[0]} alt="" className="h-full w-full object-cover" style={{ objectPosition: selected.cover_position || "50% 50%" }} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground"><CarIcon className="h-10 w-10" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <button type="button" onClick={closeCar} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60">
                <X className="h-4 w-4" />
              </button>
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <h2 className="text-xl font-bold leading-tight">{selected.make} {selected.model}</h2>
                <p className="text-sm text-white/80">{selected.plate}</p>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              <div className="flex items-center justify-between">
                <VehicleStatusBadge status={selected.status} />
                <span className="text-lg font-bold">
                  {formatMoney(selected.daily_price_cents, currency)}
                  <span className="text-sm font-normal text-muted-foreground">{t("/day")}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Detail label={t("Year")} value={selected.year} />
                <Detail label={t("Color")} value={selected.color} />
                <Detail label={t("Transmission")} value={selected.transmission ? t(selected.transmission) : null} />
                <Detail label={t("Fuel")} value={selected.fuel_type ? t(selected.fuel_type) : null} />
                <Detail label={t("Seats")} value={selected.seats} />
                <Detail label={t("Doors")} value={selected.doors} />
                <Detail label={t("Mileage")} value={selected.mileage != null ? `${selected.mileage.toLocaleString()} km` : null} />
              </div>

              {selected.description && (
                <p className="whitespace-pre-line text-sm text-muted-foreground">{selected.description}</p>
              )}

              {selected.photos && selected.photos.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {selected.photos.slice(0, 8).map((u) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={u} src={u} alt="" className="aspect-square w-full rounded-xl border border-border object-cover" />
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-border p-4">
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/cars/${selected.id}/edit`} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                  <Pencil className="h-4 w-4" /> {t("Edit car")}
                </Link>
                <Link href={`/rentals/new?vehicle=${selected.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-input bg-card text-sm font-medium hover:bg-muted">
                  <CalendarPlus className="h-4 w-4" /> {t("New rental")}
                </Link>
                <Link href={`/rentals?car=${selected.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-input bg-card text-sm font-medium hover:bg-muted">
                  <History className="h-4 w-4" /> {t("Rental history")}
                </Link>
                <Link href={`/cars/${selected.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-input bg-card text-sm font-medium hover:bg-muted">
                  <ExternalLink className="h-4 w-4" /> {t("Open full page")}
                </Link>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Spec({ icon: Icon, children, className }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium", className ?? "bg-muted text-muted-foreground")}>
      <Icon className="h-3 w-3" /> {children}
    </span>
  );
}
