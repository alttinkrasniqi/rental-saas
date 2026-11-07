import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Users } from "lucide-react";
import { ClientsList } from "./clients-list";
import { effectiveStatus, toDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export default async function ClientsPage() {
  const t = getT();
  const business = await getBusiness();
  const supabase = createClient();
  const now = new Date();

  const [{ data: cData }, { data: rData }] = await Promise.all([
    supabase.from("clients").select("*").order("full_name", { ascending: true }),
    supabase.from("rentals").select("client_id, status, total_cents, paid_cents, pickup_at, return_at, open_ended"),
  ]);

  // Per-client stats from their rentals.
  const stats = new Map<string, { count: number; spent: number; outstanding: number; last: string | null; outNow: boolean }>();
  for (const r of rData ?? []) {
    if (!r.client_id || r.status === "CANCELLED") continue;
    const s = stats.get(r.client_id) ?? { count: 0, spent: 0, outstanding: 0, last: null, outNow: false };
    s.count += 1;
    s.spent += r.paid_cents ?? 0;
    const eff = effectiveStatus(r as any, now);
    // Owed = unpaid balance on rentals that are under way or already finished.
    // A RESERVED (future) rental isn't due yet, so it is not counted; a
    // COMPLETED rental that was never fully paid IS still owed.
    if (eff !== "RESERVED") {
      s.outstanding += Math.max(0, (r.total_cents ?? 0) - (r.paid_cents ?? 0));
    }
    if (eff === "ACTIVE") {
      const covering = toDate(r.pickup_at) <= now && (r.open_ended || toDate(r.return_at) >= now);
      if (covering) s.outNow = true;
    }
    if (!s.last || r.pickup_at > s.last) s.last = r.pickup_at;
    stats.set(r.client_id, s);
  }

  const clients = (cData ?? []).map((c: any) => ({
    ...c,
    ...(stats.get(c.id) ?? { count: 0, spent: 0, outstanding: 0, last: null, outNow: false }),
  }));

  return (
    <div>
      <PageHeader
        title={t("Clients")}
        subtitle={t(clients.length === 1 ? "{n} client" : "{n} clients", { n: clients.length })}
        action={{ href: "/clients/new", label: t("Add client") }}
      />
      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("No clients yet")}
          description={t("Add clients here, or create one on the fly when you make a rental.")}
          action={{ href: "/clients/new", label: t("Add client") }}
        />
      ) : (
        <ClientsList clients={clients} currency={business?.currency ?? "EUR"} />
      )}
    </div>
  );
}
