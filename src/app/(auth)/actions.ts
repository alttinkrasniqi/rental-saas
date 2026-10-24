"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string };

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Please enter your email and password." };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Wrong email or password. Please try again." };

  redirect("/dashboard");
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Please enter an email and password." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  // If email confirmation is turned OFF in Supabase (recommended for this app),
  // a session exists immediately and we go straight to setup.
  if (data.session) redirect("/onboarding");

  return {
    error:
      "Account created. Please check your email to confirm it, then log in. " +
      "(Tip: you can turn off email confirmation in Supabase to skip this step.)",
  };
}
