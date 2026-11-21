"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";
import { numberToCents } from "@/lib/format";
import { EXPENSE_CATEGORIES, EXPENSE_METHODS } from "./constants";

function moneyToCents(v: FormDataEntryValue | null): number {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return 0;
  const n = Number(s);
  return Number.isNaN(n) ? 0 : numberToCents(n);
}

const CAT_VALUES = EXPENSE_CATEGORIES.map((c) => c.value);
const METHOD_VALUES = EXPENSE_METHODS.map((m) => m.value);

export async function addExpense(formData: FormData) {
  const business = await requireBusiness();
  const supabase = createClient();

  const amount = moneyToCents(formData.get("amount"));
  const expenseDate = String(formData.get("expense_date") || "").trim();
  if (!expenseDate || amount <= 0) return;

  const categoryRaw = String(formData.get("category") || "other");
  const category = CAT_VALUES.includes(categoryRaw) ? categoryRaw : "other";
  const methodRaw = String(formData.get("method") || "").trim();
  const method = METHOD_VALUES.includes(methodRaw) ? methodRaw : null;
  const vehicleId = String(formData.get("vehicle_id") || "") || null;
  const vendor = String(formData.get("vendor") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  await supabase.from("expenses").insert({
    business_id: business.id,
    vehicle_id: vehicleId,
    category,
    amount_cents: amount,
    expense_date: expenseDate,
    method,
    vendor,
    notes,
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  redirect("/expenses?toast=created");
}

export async function deleteExpense(formData: FormData) {
  const business = await requireBusiness();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await supabase.from("expenses").delete().eq("id", id).eq("business_id", business.id);
  revalidatePath("/expenses");
}
