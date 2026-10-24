import { createClient } from "@/lib/supabase/server";
import { RequestsList } from "./requests-list";

export const dynamic = "force-dynamic";

// Online booking requests for the signed-in owner's business.
// RLS scopes every row to the caller automatically.
export default async function RequestsPage() {
  const supabase = createClient();

  const { data: rentals } = await supabase
    .from("rentals")
    .select(
      "id, pickup_at, return_at, created_at, vehicle:vehicles(make, model, plate), client:clients(full_name, phone, email)"
    )
    .eq("source", "online")
    .eq("approved", false)
    .neq("status", "CANCELLED")
    .order("created_at", { ascending: false });

  const items = (rentals ?? []).map((r: any) => ({
    id: r.id,
    carName: [r.vehicle?.make, r.vehicle?.model].filter(Boolean).join(" ") || "Car",
    plate: r.vehicle?.plate || "",
    customer: r.client?.full_name || "—",
    phone: r.client?.phone || "",
    email: r.client?.email || "",
    from: r.pickup_at,
    to: r.return_at,
    createdAt: r.created_at,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Online booking requests</h1>
        <p className="mt-1 text-sm text-gray-500">
          Reservations from your website waiting for your approval. The car is held for these
          dates until you decide — <span className="font-medium">Approve</span> confirms the booking,
          <span className="font-medium"> Decline</span> frees the car.
        </p>
      </div>
      <RequestsList items={items} />
    </div>
  );
}
