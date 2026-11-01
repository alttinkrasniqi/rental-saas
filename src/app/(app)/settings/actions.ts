"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";
import { DEVICE_COOKIE, sha256hex } from "@/lib/device";
import { logAudit } from "@/lib/audit";

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
  await logAudit({ action: "device_removed", entity: "device", entityId: id, userId: user.id });
  revalidatePath("/settings");
  return { ok: true };
}

// ---------- Two-factor authentication (TOTP) ----------

export type MfaStatus = { enabled: boolean };

export async function getMfaStatus(): Promise<MfaStatus> {
  const supabase = createClient();
  try {
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = (data?.totp ?? []).some((f) => f.status === "verified");
    return { enabled: verified };
  } catch {
    return { enabled: false };
  }
}

// Start enrollment: returns a QR code + secret to add to the authenticator app.
export async function enrollTwoFactor(): Promise<{
  factorId?: string;
  qr?: string;
  secret?: string;
  error?: string;
}> {
  const supabase = createClient();
  // Clear any half-finished (unverified) factors so we don't pile them up.
  try {
    const { data } = await supabase.auth.mfa.listFactors();
    for (const f of data?.totp ?? []) {
      if (f.status !== "verified") {
        try { await supabase.auth.mfa.unenroll({ factorId: f.id }); } catch {}
      }
    }
  } catch {}

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error || !data) return { error: "Nuk u aktivizua dot. Provo përsëri." };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

// Finish enrollment by verifying the first code from the app.
export async function verifyEnroll(factorId: string, code: string): Promise<SettingsState> {
  const token = code.replace(/\s/g, "");
  if (token.length < 6) return { error: "Shkruaj kodin 6-shifror nga aplikacioni." };
  const supabase = createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: token });
  if (error) return { error: "Kodi është i pasaktë. Provo përsëri." };
  await logAudit({ action: "mfa_enabled" });
  revalidatePath("/settings");
  return { ok: true };
}

// Turn off 2FA: remove every TOTP factor.
export async function disableTwoFactor(): Promise<SettingsState> {
  const supabase = createClient();
  try {
    const { data } = await supabase.auth.mfa.listFactors();
    for (const f of data?.totp ?? []) {
      try { await supabase.auth.mfa.unenroll({ factorId: f.id }); } catch {}
    }
  } catch {
    return { error: "Nuk u çaktivizua dot. Provo përsëri." };
  }
  await logAudit({ action: "mfa_disabled" });
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
    await logAudit({ action: "logout_all", userId: user.id });
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

  await logAudit({ action: "settings_updated", businessId: business.id });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
