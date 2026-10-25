import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Users } from "lucide-react";
import { ClientsList } from "./clients-list";
import type { Client } from "@/lib/types";
import { getT } from "@/lib/i18n/server";

export default async function ClientsPage() {
  const t = getT();
  const supabase = createClient();
  const { data } = await supabase.from("clients").select("*").order("full_name", { ascending: true });
  const clients = (data ?? []) as Client[];

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
        <ClientsList clients={clients} />
      )}
    </div>
  );
}
