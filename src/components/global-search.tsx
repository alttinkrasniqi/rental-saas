"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Car, X } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { globalSearch, type SearchHit } from "@/app/(app)/search-actions";

export function GlobalSearch() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-global-search", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-global-search", onOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
    setQ("");
    setHits([]);
    setActive(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) { setHits([]); setLoading(false); return; }
    setLoading(true);
    const h = setTimeout(async () => {
      try {
        const r = await globalSearch(term);
        setHits(r);
        setActive(0);
      } catch {
        setHits([]);
      }
      setLoading(false);
    }, 180);
    return () => clearTimeout(h);
  }, [q, open]);

  const go = useCallback((hit: SearchHit) => {
    setOpen(false);
    router.push(hit.type === "client" ? `/clients/${hit.id}` : `/cars/${hit.id}`);
  }, [router]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (hits[active]) go(hits[active]); }
  };

  if (!open) return null;

  const clients = hits.filter((h) => h.type === "client");
  const cars = hits.filter((h) => h.type === "car");
  const activeId = hits[active]?.id;
  const short = q.trim().length < 2;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("Search clients, cars, plates…")}
            className="h-12 flex-1 bg-transparent text-sm outline-none"
          />
          <button onClick={() => setOpen(false)} aria-label={t("Close")} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {short ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("Type to search clients, cars and plates.")}</p>
          ) : loading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">…</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("No results")}</p>
          ) : (
            <>
              {clients.length > 0 && <Group label={t("Clients")} />}
              {clients.map((h) => <Row key={h.id} hit={h} activeId={activeId} onPick={go} />)}
              {cars.length > 0 && <Group label={t("Cars")} />}
              {cars.map((h) => <Row key={h.id} hit={h} activeId={activeId} onPick={go} />)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ label }: { label: string }) {
  return <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>;
}

function Row({ hit, activeId, onPick }: { hit: SearchHit; activeId?: string; onPick: (h: SearchHit) => void }) {
  const Icon = hit.type === "client" ? User : Car;
  const isActive = hit.id === activeId;
  return (
    <button
      onClick={() => onPick(hit)}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${isActive ? "bg-muted" : "hover:bg-muted"}`}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate font-medium">{hit.title}</span>
      {hit.subtitle && <span className="ml-auto shrink-0 truncate pl-2 text-xs text-muted-foreground">{hit.subtitle}</span>}
    </button>
  );
}
