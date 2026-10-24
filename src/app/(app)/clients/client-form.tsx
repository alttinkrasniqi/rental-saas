"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import type { Client } from "@/lib/types";
import type { ClientFormState } from "./actions";

type Action = (prev: ClientFormState, formData: FormData) => Promise<ClientFormState>;

export function ClientForm({
  action,
  client,
  submitLabel,
}: {
  action: Action;
  client?: Client;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, {} as ClientFormState);

  return (
    <form action={formAction} className="space-y-5">
      {client && <input type="hidden" name="id" value={client.id} />}
      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>
              Full name<span className="text-rose-500"> *</span>
            </Label>
            <Input name="full_name" defaultValue={client?.full_name} placeholder="John Smith" required />
          </div>
          <Field label="Phone">
            <Input name="phone" defaultValue={client?.phone ?? ""} placeholder="+383 4X XXX XXX" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={client?.email ?? ""} placeholder="name@email.com" />
          </Field>
          <Field label="Country">
            <Input name="country" defaultValue={client?.country ?? ""} placeholder="Kosovo" />
          </Field>
          <Field label="Address">
            <Input name="address" defaultValue={client?.address ?? ""} placeholder="Street, City" />
          </Field>
          <Field label="ID / Passport number">
            <Input name="id_number" defaultValue={client?.id_number ?? ""} />
          </Field>
          <Field label="Driver's license number">
            <Input name="license_number" defaultValue={client?.license_number ?? ""} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <Textarea name="notes" defaultValue={client?.notes ?? ""} />
            </Field>
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link
          href={client ? `/clients/${client.id}` : "/clients"}
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-white px-4 text-sm font-medium hover:bg-muted"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
