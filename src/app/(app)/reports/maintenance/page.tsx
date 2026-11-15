import { Wrench } from "lucide-react";
import { ComingSoon } from "../coming-soon";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function MaintenanceReportPage() {
  const t = getT();
  return <ComingSoon icon={Wrench} title={t("Maintenance")} />;
}
