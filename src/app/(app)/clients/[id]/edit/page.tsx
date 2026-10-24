import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ClientForm } from "../../client-form";
import { updateClientRecord } from "../../actions";
import type { Client } from "@/lib/types";

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("clients").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const client = data as Client;

  return (
    <div>
      <PageHeader title={`Edit ${client.full_name}`} />
      <ClientForm action={updateClientRecord} client={client} submitLabel="Save changes" />
    </div>
  );
}
