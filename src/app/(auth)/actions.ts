"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { validatePasswordRules } from "@/lib/password";
import { isPwnedPassword } from "@/lib/pwned";

export type AuthState = { error?: string };

const PWNED_MSG = "Ky fjalëkalim gjendet në lista publike të rrjedhura. Zgjidh një tjetër.";

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
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/confirm/i.test(error.message)) {
      return { error: "Email-i yt nuk është konfirmuar ende. Kontrollo inboksin për kodin, ose regjistrohu përsëri." };
    }
    return { error: "Email ose fjalëkalim i gabuar. Provo përsëri." };
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
  const { error } = await supabase.auth.verifyOtp({ email: e, token: code, type: "signup" });
  if (error) return { error: "Kodi është i pasaktë ose ka skaduar. Provo përsëri." };
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
  const { error: otpErr } = await supabase.auth.verifyOtp({ email: e, token, type: "recovery" });
  if (otpErr) return { error: "Kodi është i pasaktë ose ka skaduar. Provo përsëri." };

  const { error: updErr } = await supabase.auth.updateUser({ password });
  if (updErr) return { error: "Nuk u ndryshua dot fjalëkalimi. Provo përsëri." };

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

  redirect("/dashboard");
}
