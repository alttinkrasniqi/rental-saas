import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { CarForm } from "../../car-form";
import { updateVehicle } from "../../actions";
import type { Vehicle } from "@/lib/types";
import { getT } from "@/lib/i18n/server";

export default async function EditCarPage({ params }: { params: { id: string } }) {
  const t = getT();
  const supabase = createClient();
  const { data } = await supabase.from("vehicles").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const vehicle = data as Vehicle;

  return (
    <div>
      <PageHeader title={t("Edit {name}", { name: `${vehicle.make} ${vehicle.model}` })} subtitle={vehicle.plate} />
      <CarForm action={updateVehicle} vehicle={vehicle} submitLabel={t("Save changes")} />
    </div>
  );
}
