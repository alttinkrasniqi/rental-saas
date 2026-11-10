import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Users } from "lucide-react";
import { ClientsList } from "./clients-list";
import { effectiveStatus, toDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

const PAGE_SIZE = 25;
const SORTS = ["name", "rentals", "spent", "recent"] as const;
type Sort = (typeof SORTS)[number];

function enrich(c: any, rentals: any[], now: Date) {
  let count = 0, spent = 0, outstanding = 0, outNow = false;
  let last: string | null = null;
  for (const r of rentals) {
    if (r.client_id !== c.id || r.status === "CANCELLED") continue;
    count += 1;
    spent += r.paid_cents ?? 0;
    const eff = effectiveStatus(r, now);
    if (eff !== "RESERVED") outstanding += Math.max(0, (r.total_cents ?? 0) - (r.paid_cents ?? 0));
    if (eff === "ACTIVE") {
      const covering = toDate(r.pickup_at) <= now && (r.open_ended || toDate(r.return_at) >= now);
      if (covering) outNow = true;
    }
    if (!last || r.pickup_at > last) last = r.pickup_at;
  }
  return { ...c, count, spent, outstanding, outNow, last };
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string; tab?: string; sort?: string; page?: string };
}) {
  const t = getT();
  const business = await getBusiness();
  const supabase = createClient();
  const bid = business?.id ?? "";

  const tab = searchParams.tab === "deleted" ? "deleted" : "active";
  const q = (searchParams.q ?? "").trim();
  const sort = (SORTS.includes(searchParams.sort as Sort) ? searchParams.sort : "name") as Sort;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  let clients: any[] = [];
  let total = 0;
  let deletedCount = 0;

  // Fast path: aggregated + paginated by the database (view client_stats).
  let viewQuery = supabase
    .from("client_stats")
    .select("*", { count: "exact" })
    .eq("business_id", bid);
  viewQuery = tab === "deleted" ? viewQuery.eq("deleted", true) : viewQuery.not("deleted", "is", true);
  if (q) {
    const safe = q.replace(/[(),%*]/g, " ").trim();
    if (safe) viewQuery = viewQuery.or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%`);
  }
  if (sort === "rentals") viewQuery = viewQuery.order("rentals_count", { ascending: false });
  else if (sort === "spent") viewQuery = viewQuery.order("spent_cents", { ascending: false });
  else if (sort === "recent") viewQuery = viewQuery.order("last_pickup", { ascending: false, nullsFirst: false });
  else viewQuery = viewQuery.order("full_name", { ascending: true });

  const viewRes = await viewQuery.range(offset, offset + PAGE_SIZE - 1);

  if (!viewRes.error) {
    clients = (viewRes.data ?? []).map((c: any) => ({
      ...c,
      count: c.rentals_count,
      spent: c.spent_cents,
      outstanding: c.outstanding_cents,
      outNow: c.out_now,
      last: c.last_pickup,
    }));
    total = viewRes.count ?? 0;
    const del = await supabase.from("clients").select("id", { count: "exact", head: true }).eq("business_id", bid).eq("deleted", true);
    deletedCount = del.count ?? 0;
  } else {
    // Fallback (e.g. the view isn't created yet): aggregate in the app.
    const now = new Date();
    const [{ data: cData }, { data: rData }] = await Promise.all([
      supabase.from("clients").select("*").eq("business_id", bid).order("full_name", { ascending: true }),
      supabase.from("rentals").select("client_id, status, total_cents, paid_cents, pickup_at, return_at, open_ended").eq("business_id", bid),
    ]);
    const rentals = rData ?? [];
    let all = (cData ?? []).map((c: any) => enrich(c, rentals, now));
    deletedCount = all.filter((c) => c.deleted).length;
    all = all.filter((c) => (tab === "deleted" ? c.deleted : !c.deleted));
    if (q) {
      const ql = q.toLowerCase();
      all = all.filter((c) => c.full_name.toLowerCase().includes(ql) || (c.phone ?? "").toLowerCase().includes(ql) || (c.email ?? "").toLowerCase().includes(ql));
    }
    all.sort((a, b) => {
      if (sort === "rentals") return (b.count ?? 0) - (a.count ?? 0);
      if (sort === "spent") return (b.spent ?? 0) - (a.spent ?? 0);
      if (sort === "recent") return (b.last ?? "").localeCompare(a.last ?? "");
      return a.full_name.localeCompare(b.full_name);
    });
    total = all.length;
    clients = all.slice(offset, offset + PAGE_SIZE);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title={t("Clients")}
        subtitle={t(total === 1 ? "{n} client" : "{n} clients", { n: total })}
        action={{ href: "/clients/new", label: t("Add client") }}
      />
      {total === 0 && !q && tab === "active" ? (
        <EmptyState
          icon={Users}
          title={t("No clients yet")}
          description={t("Add clients here, or create one on the fly when you make a rental.")}
          action={{ href: "/clients/new", label: t("Add client") }}
        />
      ) : (
        <Suspense fallback={null}>
          <ClientsList
            clients={clients}
            currency={business?.currency ?? "EUR"}
            q={q}
            tab={tab}
            sort={sort}
            page={page}
            totalPages={totalPages}
            deletedCount={deletedCount}
          />
        </Suspense>
      )}
    </div>
  );
}
