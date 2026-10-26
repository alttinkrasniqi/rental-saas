"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { validatePasswordRules } from "@/lib/password";
import { isPwnedPassword } from "@/lib/pwned";
import { DEVICE_COOKIE, createDeviceToken, verifyDeviceToken, sha256hex } from "@/lib/device";

export type AuthState = { error?: string };

const PWNED_MSG = "Ky fjalëkalim gjendet në lista publike të rrjedhura. Zgjidh një tjetër.";

// Marks the current browser as a trusted device for this user: sets a signed
// cookie (checked by the middleware) and records a row for later review. No-op
// when DEVICE_TOKEN_SECRET isn't configured, so the feature is fully opt-in.
export async function trustCurrentDevice(uid: string, remember = true): Promise<void> {
  const secret = process.env.DEVICE_TOKEN_SECRET;
  if (!secret) return;
  const days = remember ? 30 : 1;
  const token = await createDeviceToken(uid, secret, days);
  cookies().set(DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: 60 * 60 * 24 * days } : {}),
  });
  try {
    const supabase = createClient();
    await supabase.from("trusted_devices").insert({
      user_id: uid,
      token_hash: await sha256hex(token),
      label: (headers().get("user-agent") || "").slice(0, 200) || null,
      expires_at: new Date(Date.now() + days * 86400000).toISOString(),
    });
  } catch {
    // table may not exist yet; never block auth on it
  }
}

// Full password gate: composition rules first (cheap), then a best-effort
// breach check. Returns an Albanian error, or null when acceptable.
async function checkPassword(
  pw: string,
  opts: { email?: string; name?: string } = {}
): Promise<string | null> {
  const ruleErr = validatePasswordRules(pw, opts);
  if (ruleErr) return ruleErr;
  if (await isPwnedPassword(pw)) return PWNED_MSG;
  return null;
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Shkruaj email-in dhe fjalëkalimin." };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/confirm/i.test(error.message)) {
      return { error: "Email-i yt nuk është konfirmuar ende. Kontrollo inboksin për kodin, ose regjistrohu përsëri." };
    }
    return { error: "Email ose fjalëkalim i gabuar. Provo përsëri." };
  }

  // New-device check: if this browser isn't a trusted device, email a code and
  // send the user to /verify-device before granting access. Opt-in via
  // DEVICE_TOKEN_SECRET — when unset, login proceeds straight to the app.
  const secret = process.env.DEVICE_TOKEN_SECRET;
  const uid = data.user?.id;
  if (secret && uid) {
    const token = cookies().get(DEVICE_COOKIE)?.value;
    const trusted = token ? await verifyDeviceToken(token, uid, secret) : false;
    if (!trusted) {
      try {
        await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      } catch {}
      redirect("/verify-device?sent=1");
    }
  }

  redirect("/dashboard");
}

function signupError(msg: string): string {
  if (/already registered|already been registered|already exists|exists/i.test(msg)) {
    return "Ky email është i regjistruar tashmë. Provo të kyçesh.";
  }
  return "Diçka shkoi keq. Provo përsëri.";
}

// Step 1: create the account. With email confirmation ON, no session is
// created yet and a code is emailed — the client then shows the verify step.
export async function signupStart(
  email: string,
  password: string
): Promise<{ ok?: boolean; verified?: boolean; error?: string }> {
  const e = email.trim();
  if (!e || !password) return { error: "Shkruaj një email dhe një fjalëkalim." };
  const pwErr = await checkPassword(password, { email: e });
  if (pwErr) return { error: pwErr };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email: e, password });
  if (error) return { error: signupError(error.message) };
  // If confirmation is OFF, a session exists immediately.
  if (data.session) return { ok: true, verified: true };
  return { ok: true };
}

// Step 2: verify the 6-digit code from the email. On success a session is set.
export async function verifySignup(
  email: string,
  token: string
): Promise<{ ok?: boolean; error?: string }> {
  const e = email.trim();
  const code = token.trim();
  if (code.length < 4) return { error: "Shkruaj kodin nga email-i." };

  const supabase = createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email: e, token: code, type: "signup" });
  if (error) return { error: "Kodi është i pasaktë ose ka skaduar. Provo përsëri." };
  // They just proved control of the email — trust this device so onboarding
  // isn't gated by a second code.
  if (data.user?.id) await trustCurrentDevice(data.user.id);
  return { ok: true };
}

export async function resendSignupCode(email: string): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
  if (error) return { error: "Nuk u dërgua dot kodi. Provo pas pak." };
  return { ok: true };
}

// "Harrova fjalëkalimin" — step 1: email a recovery code (and a one-click
// link as a fallback). We always report success, never revealing whether an
// email is registered.
export async function requestPasswordReset(
  email: string
): Promise<{ ok?: boolean; error?: string }> {
  const e = email.trim();
  if (!e) return { error: "Shkruaj email-in tënd." };

  const h = headers();
  const origin = h.get("origin") || (h.get("host") ? `https://${h.get("host")}` : "");

  const supabase = createClient();
  await supabase.auth.resetPasswordForEmail(e, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });
  return { ok: true };
}

// Step 2: verify the recovery code, then set the new password. This works on
// any device and avoids the "link expired" problems of one-click links.
export async function resetWithCode(
  email: string,
  code: string,
  password: string
): Promise<{ ok?: boolean; error?: string }> {
  const e = email.trim();
  const token = code.trim();
  if (token.length < 4) return { error: "Shkruaj kodin nga email-i." };
  const pwErr = await checkPassword(password, { email: e });
  if (pwErr) return { error: pwErr };

  const supabase = createClient();
  const { data, error: otpErr } = await supabase.auth.verifyOtp({ email: e, token, type: "recovery" });
  if (otpErr) return { error: "Kodi është i pasaktë ose ka skaduar. Provo përsëri." };

  const { error: updErr } = await supabase.auth.updateUser({ password });
  if (updErr) return { error: "Nuk u ndryshua dot fjalëkalimi. Provo përsëri." };

  if (data.user?.id) await trustCurrentDevice(data.user.id);
  return { ok: true };
}

// Set the new password. Requires the recovery session created by the link.
export async function updatePassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const pw = String(formData.get("password") || "");
  const pw2 = String(formData.get("password2") || "");
  if (pw !== pw2) return { error: "Fjalëkalimet nuk përputhen." };
  const pwErr = await checkPassword(pw);
  if (pwErr) return { error: pwErr };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Linku ka skaduar ose u hap në pajisje tjetër. Kërko një link të ri." };

  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) return { error: "Nuk u ndryshua dot fjalëkalimi. Provo përsëri." };

  await trustCurrentDevice(user.id);
  redirect("/dashboard");
}
