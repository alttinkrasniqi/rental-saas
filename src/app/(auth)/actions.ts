"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string };

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Shkruaj email-in dhe fjalëkalimin." };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email ose fjalëkalim i gabuar. Provo përsëri." };

  redirect("/dashboard");
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Shkruaj një email dhe një fjalëkalim." };
  if (password.length < 6) return { error: "Fjalëkalimi duhet të ketë të paktën 6 karaktere." };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  // If email confirmation is turned OFF in Supabase (recommended for this app),
  // a session exists immediately and we go straight to setup.
  if (data.session) redirect("/onboarding");

  return {
    error:
      "Llogaria u krijua. Kontrollo email-in për ta konfirmuar, pastaj kyçu. " +
      "(Këshillë: mund ta çaktivizosh konfirmimin me email te Supabase për ta kaluar këtë hap.)",
  };
}
