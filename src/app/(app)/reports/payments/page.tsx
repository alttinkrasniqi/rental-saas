import { CreditCard } from "lucide-react";
import { ComingSoon } from "../coming-soon";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function PaymentsReportPage() {
  const t = getT();
  return <ComingSoon icon={CreditCard} title={t("Payments & debts")} />;
}
