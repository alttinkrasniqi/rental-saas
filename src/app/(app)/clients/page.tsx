import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Users } from "lucide-react";
import { ClientsList } from "./clients-list";
import type { Client } from "@/lib/types";

export default async function ClientsPage() {
  const supabase = createClient();
  const { data } = await supabase.from("clients").select("*").order("full_name", { ascending: true });
  const clients = (data ?? []) as Client[];

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} ${clients.length === 1 ? "client" : "clients"}`}
        action={{ href: "/clients/new", label: "Add client" }}
      />
      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add clients here, or create one on the fly when you make a rental."
          action={{ href: "/clients/new", label: "Add client" }}
        />
      ) : (
        <ClientsList clients={clients} />
      )}
    </div>
  );
}
