"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Phone, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";

interface Row {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  deleted?: boolean;
}

export function ClientsList({ clients }: { clients: Row[] }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"active" | "deleted">("active");

  const deletedCount = useMemo(() => clients.filter((c) => c.deleted).length, [clients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => (tab === "deleted" ? c.deleted : !c.deleted))
      .filter((c) => {
        if (!q) return true;
        return (
          c.full_name.toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q)
        );
      });
  }, [clients, query, tab]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Tab active={tab === "active"} onClick={() => setTab("active")}>
          {t("Active:tab")}
        </Tab>
        <Tab active={tab === "deleted"} onClick={() => setTab("deleted")}>
          {t("Deleted")}{deletedCount > 0 ? ` (${deletedCount})` : ""}
        </Tab>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search name, phone or email")}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {tab === "deleted" ? t("No deleted clients.") : t("No clients match your search.")}
        </p>
      ) : (
        <Card className="divide-y divide-border">
          {filtered.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
                    c.deleted ? "bg-rose-100 text-rose-600" : "bg-primary/10 text-primary"
                  )}
                >
                  {c.full_name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">
                    {c.full_name}
                    {c.deleted && <span className="ml-2 text-xs font-normal text-rose-600">{t("(Deleted)")}</span>}
                  </p>
                  {c.phone && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </Card>
      )}
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
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-input bg-white text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
