"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/business";
import type { SiteSettings } from "@/lib/site";

// SECURITY: only the signed-in owner may save their website content. We resolve
// the business from the session (never from a client-supplied id), then use the
// admin client ONLY to write the two rows for THAT business id. site_settings is
// written with the admin client because it has no RLS policy of its own yet.
export async function saveSite(
  settings: SiteSettings,
  contact: { phone: string; email: string; address: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const business = await requireBusiness();
    const id = business.id;
    const admin = createAdminClient();

    const { error: e1 } = await admin.from("site_settings").upsert({
      business_id: id,
      data: settings,
      updated_at: new Date().toISOString(),
    });
    if (e1) return { ok: false, error: e1.message };

    const { error: e2 } = await admin
      .from("businesses")
      .update({
        phone: contact.phone || null,
        email: contact.email || null,
        address: contact.address || null,
      })
      .eq("id", id);
    if (e2) return { ok: false, error: e2.message };

    revalidatePath("/s/[slug]", "page");
    revalidatePath("/website");
    return { ok: true };
  } catch (e: any) {
    if (e?.message === "NO_BUSINESS") return { ok: false, error: "Please sign in again." };
    return { ok: false, error: e?.message || "Save failed." };
  }
}
