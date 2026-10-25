import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ClipboardList } from "lucide-react";
import { RentalsList } from "./rentals-list";
import { getT } from "@/lib/i18n/server";

export default async function RentalsPage() {
  const t = getT();
  const business = await getBusiness();
  const supabase = createClient();
  const { data } = await supabase
    .from("rentals")
    .select("*, vehicle:vehicles(make, model, plate), client:clients(full_name)")
    .order("pickup_at", { ascending: false });

  const rentals = (data ?? []) as any[];

  return (
    <div>
      <PageHeader
        title={t("Rentals")}
        subtitle={t("{n} total", { n: rentals.length })}
        action={{ href: "/rentals/new", label: t("New rental") }}
      />
      {rentals.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t("No rentals yet")}
          description={t("Create your first rental to see it here and on your calendar.")}
          action={{ href: "/rentals/new", label: t("New rental") }}
        />
      ) : (
        <RentalsList rentals={rentals} currency={business?.currency ?? "EUR"} />
      )}
    </div>
  );
}
