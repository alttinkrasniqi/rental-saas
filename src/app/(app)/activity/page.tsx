import { redirect } from "next/navigation";
import { getBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { getT } from "@/lib/i18n/server";
import { Card, CardContent } from "@/components/ui/card";

type AuditRow = {
  id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  ip: string | null;
  created_at: string;
};

// Albanian labels for the recorded actions.
const LABELS: Record<string, string> = {
  login: "Hyrje në llogari",
  login_2fa: "Hyrje (me verifikim në dy hapa)",
  logout: "Dalje",
  logout_all: "Dalje nga të gjitha pajisjet",
  password_changed: "Ndryshim fjalëkalimi",
  signup_verified: "Verifikim i regjistrimit",
  suspicious_login: "Hyrje e dyshimtë (vend i ri)",
  device_verified: "Pajisje e re e verifikuar",
  device_removed: "Pajisje e hequr",
  mfa_enabled: "Verifikimi në dy hapa u aktivizua",
  mfa_disabled: "Verifikimi në dy hapa u çaktivizua",
  settings_updated: "Cilësimet u përditësuan",
  rental_deleted: "Rezervim i fshirë",
  car_deleted: "Makinë e fshirë",
};

function fmt(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("sq-AL", { timeZone: "Europe/Tirane", dateStyle: "medium", timeStyle: "short" });
}

export default async function ActivityPage() {
  const t = getT();
  const business = await getBusiness();
  if (!business) redirect("/onboarding");

  const supabase = createClient();
  let rows: AuditRow[] = [];
  try {
    const { data } = await supabase
      .from("audit_log")
      .select("id, action, entity, entity_id, ip, created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(100);
    rows = (data as AuditRow[]) ?? [];
  } catch {
    rows = [];
  }

  return (
    <div>
      <PageHeader title={t("Activity")} subtitle={t("Recent security and account activity")} />

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("No activity recorded yet.")}</p>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{LABELS[r.action] ?? r.action}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {fmt(r.created_at)}
                    {r.ip ? ` · ${r.ip}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
