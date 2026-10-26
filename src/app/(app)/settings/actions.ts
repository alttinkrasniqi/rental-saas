"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";
import { DEVICE_COOKIE, sha256hex } from "@/lib/device";

export type SettingsState = { error?: string; ok?: boolean };

export type TrustedDevice = {
  id: string;
  label: string | null;
  created_at: string;
  expires_at: string | null;
  current: boolean;
};

// Lists the signed-in user's trusted devices, newest first, marking the one
// in use right now. Returns [] if the table doesn't exist yet.
export async function getTrustedDevices(): Promise<TrustedDevice[]> {
  await requireBusiness();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from("trusted_devices")
      .select("id, label, created_at, expires_at, token_hash")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error || !data) return [];

    const token = cookies().get(DEVICE_COOKIE)?.value;
    const currentHash = token ? await sha256hex(token) : "";
    return data.map((d: any) => ({
      id: d.id,
      label: d.label,
      created_at: d.created_at,
      expires_at: d.expires_at,
      current: !!currentHash && d.token_hash === currentHash,
    }));
  } catch {
    return [];
  }
}

// Removes one trusted device. After this, that browser must verify by email
// again on its next navigation.
export async function revokeDevice(id: string): Promise<SettingsState> {
  await requireBusiness();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesioni ka skaduar." };

  const { error } = await supabase.from("trusted_devices").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Nuk u hoq dot pajisja." };
  revalidatePath("/settings");
  return { ok: true };
}

// "Log out everywhere": drop every trusted device, revoke all sessions
// globally, clear local cookies, and bounce to the landing page.
export async function revokeAllDevices(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    try {
      await supabase.from("trusted_devices").delete().eq("user_id", user.id);
    } catch {}
  }
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch {}
  try {
    const store = cookies();
    for (const c of store.getAll()) {
      if (c.name.startsWith("sb-") || c.name === DEVICE_COOKIE) store.delete(c.name);
    }
  } catch {}
  redirect("/");
}

export async function updateBusiness(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const business = await requireBusiness();
  const supabase = createClient();

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Business name is required." };

  const { error } = await supabase
    .from("businesses")
    .update({
      name,
      phone: String(formData.get("phone") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      address: String(formData.get("address") || "").trim() || null,
      currency: String(formData.get("currency") || "EUR").trim() || "EUR",
      timezone: String(formData.get("timezone") || "Europe/Tirane").trim(),
    })
    .eq("id", business.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
