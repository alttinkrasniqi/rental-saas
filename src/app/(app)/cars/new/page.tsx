import { PageHeader } from "@/components/page-header";
import { CarForm } from "../car-form";
import { createVehicle } from "../actions";
import { getT } from "@/lib/i18n/server";

export default function NewCarPage() {
  const t = getT();
  return (
    <div>
      <PageHeader title={t("Add car")} subtitle={t("Add a vehicle to your fleet")} />
      <CarForm action={createVehicle} submitLabel={t("Add car")} />
    </div>
  );
}
