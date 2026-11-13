"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";
import { numberToCents } from "@/lib/format";
import { evalPromo } from "@/lib/promo";

export type PromoState = { error?: string };
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function createPromoCode(_prev: PromoState, formData: FormData): Promise<PromoState> {
  const business = await requireBusiness();
  const supabase = createClient();

  const code = String(formData.get("code") || "").trim().toUpperCase().replace(/\s+/g, "");
  const type = String(formData.get("discount_type") || "percent");
  if (!code) return { error: "Enter a code." };
  if (!/^[A-Z0-9_-]{2,32}$/.test(code)) return { error: "Code: letters, numbers, - or _ (2–32 chars)." };
  if (type !== "percent" && type !== "fixed") return { error: "Invalid discount type." };

  let discount_value: number;
  if (type === "percent") {
    const p = parseInt(String(formData.get("percent") || ""), 10);
    if (!Number.isFinite(p) || p <= 0 || p > 100) return { error: "Percentage must be between 1 and 100." };
    discount_value = p;
  } else {
    const amt = Number(String(formData.get("amount") || "").replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) return { error: "Enter a discount amount." };
    discount_value = numberToCents(amt);
  }

  const minRaw = Number(String(formData.get("min_total") || "").replace(",", "."));
  const min_total_cents = Number.isFinite(minRaw) && minRaw > 0 ? numberToCents(minRaw) : null;
  const vf = String(formData.get("valid_from") || "").trim();
  const vt = String(formData.get("valid_to") || "").trim();
  const valid_from = isDate(vf) ? vf : null;
  const valid_to = isDate(vt) ? vt : null;
  if (valid_from && valid_to && valid_to < valid_from) return { error: "The end date must be on or after the start date." };
  const muRaw = parseInt(String(formData.get("max_uses") || ""), 10);
  const max_uses = Number.isFinite(muRaw) && muRaw > 0 ? muRaw : null;

  const { error } = await supabase.from("promo_codes").insert({
    business_id: business.id,
    code,
    discount_type: type,
    discount_value,
    min_total_cents,
    valid_from,
    valid_to,
    max_uses,
  });
  if (error) {
    if ((error as any).code === "23505" || /duplicate|unique/i.test(error.message)) return { error: "That code already exists." };
    return { error: error.message };
  }

  revalidatePath("/marketing");
  return {};
}

export async function deletePromoCode(formData: FormData) {
  await requireBusiness();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await supabase.from("promo_codes").delete().eq("id", id);
  revalidatePath("/marketing");
}

export async function togglePromoCode(formData: FormData) {
  await requireBusiness();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const active = String(formData.get("active") || "") === "true";
  if (!id) return;
  await supabase.from("promo_codes").update({ active: !active }).eq("id", id);
  revalidatePath("/marketing");
}

// Live check used by the booking form to preview a discount.
export type PromoResult = {
  ok: boolean;
  discountCents?: number;
  code?: string;
  discount_type?: "percent" | "fixed";
  discount_value?: number;
  min_total_cents?: number | null;
  error?: string;
};

export async function checkPromoCode(codeRaw: string, totalCents: number): Promise<PromoResult> {
  try {
    await requireBusiness();
    const supabase = createClient();
    const code = (codeRaw || "").trim().toUpperCase();
    if (!code) return { ok: false, error: "Enter a code." };
    // RLS scopes this to the caller's business.
    const { data } = await supabase.from("promo_codes").select("*").eq("code", code).maybeSingle();
    if (!data) return { ok: false, error: "Code not found." };
    const today = new Date().toISOString().slice(0, 10);
    const res = evalPromo(data as any, Math.round(totalCents), today);
    if (!res.ok) return { ok: false, error: res.error };
    return {
      ok: true,
      discountCents: res.discountCents,
      code,
      discount_type: (data as any).discount_type,
      discount_value: (data as any).discount_value,
      min_total_cents: (data as any).min_total_cents ?? null,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Something went wrong." };
  }
}
