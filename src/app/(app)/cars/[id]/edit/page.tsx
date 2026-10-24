import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { CarForm } from "../../car-form";
import { updateVehicle } from "../../actions";
import type { Vehicle } from "@/lib/types";

export default async function EditCarPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("vehicles").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const vehicle = data as Vehicle;

  return (
    <div>
      <PageHeader title={`Edit ${vehicle.make} ${vehicle.model}`} subtitle={vehicle.plate} />
      <CarForm action={updateVehicle} vehicle={vehicle} submitLabel="Save changes" />
    </div>
  );
}
