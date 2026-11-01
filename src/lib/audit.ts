import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuditInput = {
  action: string;              // e.g. "login", "password_changed", "rental_deleted"
  entity?: string;             // e.g. "rental", "car", "client"
  entityId?: string;
  metadata?: Record<string, unknown>;
  userId?: string;             // pass to skip the user lookup
  businessId?: string | null;  // pass to skip the business lookup
};

// Records a sensitive action. Writes with the service role so it always lands,
// regardless of RLS. Never throws — auditing must not break the real action.
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    let userId = input.userId;
    let businessId = input.businessId;

    if (userId === undefined || businessId === undefined) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (userId === undefined) userId = user?.id;
      if (businessId === undefined) {
        if (user) {
          const { data: biz } = await supabase
            .from("businesses")
            .select("id")
            .eq("owner_id", user.id)
            .maybeSingle();
          businessId = biz?.id ?? null;
        } else {
          businessId = null;
        }
      }
    }

    const ip = (headers().get("x-forwarded-for") || "").split(",")[0].trim() || null;

    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      user_id: userId ?? null,
      business_id: businessId ?? null,
      action: input.action,
      entity: input.entity ?? null,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? null,
      ip,
    });
  } catch {
    // swallow — auditing is best-effort
  }
}
