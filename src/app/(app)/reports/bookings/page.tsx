import { CalendarCheck } from "lucide-react";
import { ComingSoon } from "../coming-soon";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function BookingsReportPage() {
  const t = getT();
  return <ComingSoon icon={CalendarCheck} title={t("Bookings")} />;
}
