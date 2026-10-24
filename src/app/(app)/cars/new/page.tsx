import { PageHeader } from "@/components/page-header";
import { CarForm } from "../car-form";
import { createVehicle } from "../actions";

export default function NewCarPage() {
  return (
    <div>
      <PageHeader title="Add car" subtitle="Add a vehicle to your fleet" />
      <CarForm action={createVehicle} submitLabel="Add car" />
    </div>
  );
}
