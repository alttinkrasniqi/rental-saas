import { PageHeader } from "@/components/page-header";
import { ClientForm } from "../client-form";
import { createClientRecord } from "../actions";
import { getT } from "@/lib/i18n/server";

export default function NewClientPage() {
  const t = getT();
  return (
    <div>
      <PageHeader title={t("Add client")} />
      <ClientForm action={createClientRecord} submitLabel={t("Add client")} />
    </div>
  );
}
