import { TrendingUp } from "lucide-react";
import { ComingSoon } from "../coming-soon";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function RevenueReportPage() {
  const t = getT();
  return <ComingSoon icon={TrendingUp} title={t("Revenue")} />;
}
