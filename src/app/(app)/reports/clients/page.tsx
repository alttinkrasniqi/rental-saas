import { Users } from "lucide-react";
import { ComingSoon } from "../coming-soon";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function ClientsReportPage() {
  const t = getT();
  return <ComingSoon icon={Users} title={t("Clients")} />;
}
