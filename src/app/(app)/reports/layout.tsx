import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { DateFilter } from "@/components/date-filter";
import { ReportsNav } from "./reports-nav";
import { getT } from "@/lib/i18n/server";

// Shared shell for the whole Reports section: a title, an inner sidebar to
// switch between reports, and a period filter that applies to the active one.
// Each report is its own page under /reports/* and reads the period from the URL.
export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const t = getT();
  return (
    <div>
      <PageHeader title={t("Reports")} subtitle={t("Business analytics")} />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <Suspense fallback={null}>
          <ReportsNav />
        </Suspense>
        <div className="space-y-5">
          <Suspense fallback={null}>
            <DateFilter />
          </Suspense>
          {children}
        </div>
      </div>
    </div>
  );
}
