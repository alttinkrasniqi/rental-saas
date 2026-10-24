import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Pencil, Phone, Mail, MapPin, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RentalStatusBadge, PaymentStatusBadge } from "@/components/status-badges";
import { ConfirmButton } from "@/components/confirm-button";
import { formatMoney, formatDate } from "@/lib/format";

// Soft-delete: hide the client but KEEP their rentals and payments. The client
// row stays so rentals/payments can still link back to it (shown as "Deleted").
async function softDeleteClientAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("clients").update({ deleted: true, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect("/clients");
}

async function restoreClientAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("clients").update({ deleted: false, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const business = await getBusiness();
  const currency = business?.currency ?? "EUR";
  const supabase = createClient();

  const { data: cData } = await supabase.from("clients").select("*").eq("id", params.id).maybeSingle();
  if (!cData) notFound();
  const client = cData as any;

  const { data: rData } = await supabase
    .from("rentals")
    .select("*, vehicle:vehicles(id, make, model, plate)")
    .eq("client_id", client.id)
    .order("pickup_at", { ascending: false });
  const rentals = (rData ?? []) as any[];

  const counted = rentals.filter((r) => r.status !== "CANCELLED");
  const totalSpent = counted.reduce((s, r) => s + (r.paid_cents ?? 0), 0);
  const contact: [React.ReactNode, string | null][] = [
    [<Phone key="p" className="h-4 w-4" />, client.phone],
    [<Mail key="m" className="h-4 w-4" />, client.email],
    [<MapPin key="a" className="h-4 w-4" />, client.address],
  ];

  return (
    <div className="space-y-6">
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{client.full_name}</h1>
            {client.deleted && (
              <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                Deleted
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
            {contact
              .filter(([, v]) => v)
              .map(([icon, v], i) => (
                <span key={i} className="flex items-center gap-2">
                  {icon} {v}
                </span>
              ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!client.deleted && (
            <Link
              href={`/rentals/new?client=${client.id}`}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> New rental
            </Link>
          )}
          <Link
            href={`/clients/${client.id}/edit`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-white px-4 text-sm font-medium hover:bg-muted"
          >
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        </div>
      </div>

      {client.deleted && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          This client is deleted. Their history is kept here, but they won&apos;t appear in the
          active list or when creating new rentals until restored.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Rentals" value={String(counted.length)} />
        <StatCard label="Total spent" value={formatMoney(totalSpent, currency)} />
        <StatCard label="Last rental" value={rentals[0] ? formatDate(rentals[0].pickup_at) : "—"} />
      </div>

      {(client.id_number || client.license_number || client.country) && (
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-3 text-sm sm:grid-cols-3">
              {client.country && <Info k="Country" v={client.country} />}
              {client.id_number && <Info k="ID / Passport" v={client.id_number} />}
              {client.license_number && <Info k="Driver's license" v={client.license_number} />}
            </dl>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Rental history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rentals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rentals yet.</p>
          ) : (
            rentals.map((r) => (
              <Link
                key={r.id}
                href={`/rentals/${r.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3 hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : "Vehicle"}{" "}
                    <span className="text-muted-foreground">{r.vehicle?.plate}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.pickup_at)} → {formatDate(r.return_at)} · {formatMoney(r.total_cents, currency)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PaymentStatusBadge paid_cents={r.paid_cents} total_cents={r.total_cents} />
                  <RentalStatusBadge status={r.status} />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {client.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{client.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="pt-2">
        {client.deleted ? (
          <form action={restoreClientAction}>
            <input type="hidden" name="id" value={client.id} />
            <button type="submit" className="text-sm font-medium text-emerald-700 hover:underline">
              Restore this client
            </button>
          </form>
        ) : (
          <ConfirmButton
            action={softDeleteClientAction}
            id={client.id}
            message="Delete this client? Their past rentals and payments are kept — the client just moves to the 'Deleted' filter and won't appear when creating new rentals. You can restore them anytime."
            className="text-sm font-medium text-rose-600 hover:underline"
          >
            Delete this client
          </ConfirmButton>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
