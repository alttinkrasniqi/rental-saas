"use server";

import { createClient } from "@/lib/supabase/server";
import { trustCurrentDevice } from "../(auth)/actions";
import { rateLimit, retryMessage } from "@/lib/ratelimit";

// Email a fresh verification code to the signed-in user (Supabase email OTP,
// rendered with the "Magic Link" template).
export async function sendDeviceCode(): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sesioni ka skaduar. Kyçu përsëri." };

  const limit = await rateLimit(`devcode:send:${user.id}`, 6, 3600);
  if (!limit.allowed) return { error: retryMessage(limit.retryAfter) };

  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  });
  if (error) return { error: "Nuk u dërgua dot kodi. Provo pas pak." };
  return { ok: true };
}

// Verify the emailed code; on success, trust this device.
export async function verifyDeviceCode(
  code: string,
  remember: boolean
): Promise<{ ok?: boolean; error?: string }> {
  const token = code.trim();
  if (token.length < 4) return { error: "Shkruaj kodin nga email-i." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sesioni ka skaduar. Kyçu përsëri." };

  const limit = await rateLimit(`devcode:verify:${user.id}`, 10, 600);
  if (!limit.allowed) return { error: retryMessage(limit.retryAfter) };

  const { error } = await supabase.auth.verifyOtp({ email: user.email, token, type: "email" });
  if (error) return { error: "Kodi është i pasaktë ose ka skaduar. Provo përsëri." };

  await trustCurrentDevice(user.id, remember);
  return { ok: true };
}
