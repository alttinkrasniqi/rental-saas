import { PageHeader } from "@/components/page-header";
import { ClientForm } from "../client-form";
import { createClientRecord } from "../actions";

export default function NewClientPage() {
  return (
    <div>
      <PageHeader title="Add client" />
      <ClientForm action={createClientRecord} submitLabel="Add client" />
    </div>
  );
}
