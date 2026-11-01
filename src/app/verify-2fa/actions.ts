"use server";

import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientIp, retryMessage } from "@/lib/ratelimit";
import { logAudit } from "@/lib/audit";

// Completes the TOTP (authenticator) challenge at login, stepping the session
// up to AAL2.
export async function verifyTwoFactor(code: string): Promise<{ ok?: boolean; error?: string }> {
  const token = code.replace(/\s/g, "");
  if (token.length < 6) return { error: "Shkruaj kodin 6-shifror nga aplikacioni." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const limit = await rateLimit(`2fa:${user?.id ?? clientIp()}`, 10, 600);
  if (!limit.allowed) return { error: retryMessage(limit.retryAfter) };

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = (factors?.totp ?? []).find((f) => f.status === "verified");
  if (!factor) return { error: "Nuk u gjet asnjë faktor i verifikuar." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: token });
  if (error) return { error: "Kodi është i pasaktë ose ka skaduar. Provo përsëri." };
  await logAudit({ action: "login_2fa", userId: user?.id });
  return { ok: true };
}
