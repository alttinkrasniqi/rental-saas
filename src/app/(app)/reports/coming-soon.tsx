import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";

// Shared placeholder for reports that aren't built yet, so the sidebar links
// never 404. Replaced by the real report page as each one ships.
export function ComingSoon({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  const t = getT();
  return (
    <Card className="rounded-2xl">
      <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="h-7 w-7" />
        </span>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{t("We're preparing this report. It will appear here soon.")}</p>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{t("Coming soon")}</span>
      </div>
    </Card>
  );
}
