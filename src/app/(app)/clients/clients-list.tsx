"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Phone,
  MessageCircle,
  Mail,
  CalendarPlus,
  History,
  Pencil,
  X,
  MapPin,
  Hash,
  CreditCard,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";

const digits = (p?: string | null) => (p ?? "").replace(/\D/g, "");

export function ClientsList({
  clients,
  currency,
  q,
  tab,
  sort,
  page,
  totalPages,
  deletedCount,
}: {
  clients: any[];
  currency: string;
  q: string;
  tab: "active" | "deleted";
  sort: string;
  page: number;
  totalPages: number;
  deletedCount: number;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [search, setSearch] = useState(q);
  const [selected, setSelected] = useState<any | null>(null);
  const [shown, setShown] = useState(false);

  const push = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(Array.from(sp.entries()));
    for (const [k, v] of Object.entries(updates)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(pathname + (qs ? `?${qs}` : ""), { scroll: false });
  };

  // Debounced search → URL (server refetches). Resets to page 1.
  useEffect(() => {
    const id = setTimeout(() => {
      if (search.trim() !== q) push({ q: search.trim() || null, page: null });
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openClient = (c: any) => { setSelected(c); requestAnimationFrame(() => setShown(true)); };
  const closeClient = () => { setShown(false); setTimeout(() => setSelected(null), 200); };

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeClient(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Tab active={tab === "active"} onClick={() => push({ tab: null, page: null })}>{t("Active:tab")}</Tab>
          <Tab active={tab === "deleted"} onClick={() => push({ tab: "deleted", page: null })}>
            {t("Deleted")}{deletedCount > 0 ? ` (${deletedCount})` : ""}
          </Tab>
        </div>
        <select
          value={sort}
          onChange={(e) => push({ sort: e.target.value === "name" ? null : e.target.value, page: null })}
          className="h-9 rounded-md border border-input bg-card px-2 text-sm outline-none focus:border-primary"
        >
          <option value="name">{t("Name")}</option>
          <option value="rentals">{t("Most rentals")}</option>
          <option value="spent">{t("Most spent")}</option>
          <option value="recent">{t("Recent")}</option>
        </select>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Search name, phone or email")}
          className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {clients.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {tab === "deleted" ? t("No deleted clients.") : t("No clients match your search.")}
        </p>
      ) : (
        <Card className="divide-y divide-border">
          {clients.map((c) => (
            <button key={c.id} type="button" onClick={() => openClient(c)} className="group flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/60">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={c.full_name} deleted={c.deleted} />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="truncate">{c.full_name}</span>
                    {c.outNow && <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{t("Out now")}</span>}
                    {c.deleted && <span className="shrink-0 text-xs font-normal text-rose-600">{t("(Deleted)")}</span>}
                  </p>
                  <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                    {c.phone ? <><Phone className="h-3 w-3 shrink-0" /> {c.phone}</> : c.email ? <><Mail className="h-3 w-3 shrink-0" /> {c.email}</> : "—"}
                  </p>
                </div>
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </span>
            </button>
          ))}
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => push({ page: page - 1 <= 1 ? null : String(page - 1) })}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">{t("Page {n} of {m}", { n: page, m: totalPages })}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => push({ page: String(page + 1) })}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Client quick-view drawer (non-modal) */}
      {selected && (() => {
        const c = selected;
        const wa = digits(c.phone);
        const place = [c.address, c.country].filter(Boolean).join(", ");
        return (
          <aside className={cn(
            "fixed inset-y-2 right-2 z-50 flex w-[calc(100%-1rem)] max-w-md transform flex-col overflow-hidden rounded-3xl bg-card shadow-2xl ring-1 ring-black/5 transition-transform duration-300 ease-out sm:inset-y-4 sm:right-4",
            shown ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]"
          )}>
            <div className="relative shrink-0 bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground">
              <button type="button" onClick={closeClient} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30">
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3 pr-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
                  {c.full_name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold leading-tight">{c.full_name}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    {c.outNow && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">{t("Out now")}</span>}
                    {c.deleted && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">{t("(Deleted)")}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-2">
                <ContactBtn href={c.phone ? `tel:${c.phone}` : undefined} icon={Phone} label={t("Call")} />
                <ContactBtn href={wa ? `https://wa.me/${wa}` : undefined} icon={MessageCircle} label={t("WhatsApp")} external />
                <ContactBtn href={c.email ? `mailto:${c.email}` : undefined} icon={Mail} label={t("Email")} />
              </div>

              <div className="space-y-1">
                <DetailRow icon={Phone} value={c.phone} />
                <DetailRow icon={Mail} value={c.email} />
                <DetailRow icon={MapPin} value={place || null} />
                <DetailRow icon={Hash} value={c.id_number} hint={t("ID number")} />
                <DetailRow icon={CreditCard} value={c.license_number} hint={t("License number")} />
              </div>

              {c.notes && <p className="whitespace-pre-line rounded-xl border border-border p-3 text-sm text-muted-foreground">{c.notes}</p>}

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t("Rentals")}</p>
                  <p className="mt-0.5 font-bold">{c.count ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t("Spent")}</p>
                  <p className="mt-0.5 font-bold text-emerald-600">{formatMoney(c.spent ?? 0, currency)}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">{t("Owed")}</p>
                  <p className={cn("mt-0.5 font-bold", (c.outstanding ?? 0) > 0 ? "text-rose-600" : "text-muted-foreground")}>{formatMoney(c.outstanding ?? 0, currency)}</p>
                </div>
              </div>
            </div>

            <div className="shrink-0 space-y-2 border-t border-border p-4">
              <Link href={`/rentals/new?client=${c.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                <CalendarPlus className="h-4 w-4" /> {t("New rental")}
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/rentals?client=${c.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-input bg-card text-sm font-medium hover:bg-muted">
                  <History className="h-4 w-4" /> {t("Rental history")}
                </Link>
                <Link href={`/clients/${c.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-input bg-card text-sm font-medium hover:bg-muted">
                  <Pencil className="h-4 w-4" /> {t("Open profile")}
                </Link>
              </div>
            </div>
          </aside>
        );
      })()}
    </div>
  );
}

function Avatar({ name, deleted }: { name: string; deleted?: boolean }) {
  return (
    <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold", deleted ? "bg-rose-100 text-rose-600" : "bg-primary/10 text-primary")}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function ContactBtn({ href, icon: Icon, label, external }: { href?: string; icon: React.ComponentType<{ className?: string }>; label: string; external?: boolean }) {
  const base = "flex flex-col items-center justify-center gap-1 rounded-xl border py-3 text-xs font-medium";
  if (!href) {
    return (
      <div className={cn(base, "border-border bg-muted/30 text-muted-foreground/50")}>
        <Icon className="h-5 w-5" /> {label}
      </div>
    );
  }
  return (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className={cn(base, "border-input bg-card text-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary")}>
      <Icon className="h-5 w-5" /> {label}
    </a>
  );
}

function DetailRow({ icon: Icon, value, hint }: { icon: React.ComponentType<{ className?: string }>; value?: string | null; hint?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 break-words">{value}</span>
      {hint && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-md border px-3 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-input bg-white text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
