import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Users } from "lucide-react";
import { ClientsList } from "./clients-list";
import { getT } from "@/lib/i18n/server";

const PAGE_SIZE = 25;
const SORTS = ["name", "rentals", "spent", "recent"] as const;
type Sort = (typeof SORTS)[number];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string; tab?: string; sort?: string; page?: string };
}) {
  const t = getT();
  const business = await getBusiness();
  const supabase = createClient();

  const tab = searchParams.tab === "deleted" ? "deleted" : "active";
  const q = (searchParams.q ?? "").trim();
  const sort = (SORTS.includes(searchParams.sort as Sort) ? searchParams.sort : "name") as Sort;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Pull ONE page of clients with their stats pre-aggregated by the database.
  let query = supabase
    .from("client_stats")
    .select("*", { count: "exact" })
    .eq("business_id", business?.id ?? "")
    .eq("deleted", tab === "deleted");

  if (q) {
    const safe = q.replace(/[(),%*]/g, " ").trim();
    if (safe) query = query.or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%`);
  }

  if (sort === "rentals") query = query.order("rentals_count", { ascending: false });
  else if (sort === "spent") query = query.order("spent_cents", { ascending: false });
  else if (sort === "recent") query = query.order("last_pickup", { ascending: false, nullsFirst: false });
  else query = query.order("full_name", { ascending: true });

  const { data, count } = await query.range(offset, offset + PAGE_SIZE - 1);

  const clients = (data ?? []).map((c: any) => ({
    ...c,
    count: c.rentals_count,
    spent: c.spent_cents,
    outstanding: c.outstanding_cents,
    outNow: c.out_now,
    last: c.last_pickup,
  }));

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Count for the "Deleted" tab badge (cheap head-count).
  const { count: deletedCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business?.id ?? "")
    .eq("deleted", true);

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
            deletedCount={deletedCount ?? 0}
          />
        </Suspense>
      )}
    </div>
  );
}
