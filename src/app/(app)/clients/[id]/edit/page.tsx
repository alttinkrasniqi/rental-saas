import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ClientForm } from "../../client-form";
import { updateClientRecord } from "../../actions";
import type { Client } from "@/lib/types";
import { getT } from "@/lib/i18n/server";

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const t = getT();
  const supabase = createClient();
  const { data } = await supabase.from("clients").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const client = data as Client;

  return (
    <div>
      <PageHeader title={t("Edit {name}", { name: client.full_name })} />
      <ClientForm action={updateClientRecord} client={client} submitLabel={t("Save changes")} />
    </div>
  );
}
