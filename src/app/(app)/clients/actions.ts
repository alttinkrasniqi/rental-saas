"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabase } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";

export type ClientFormState = { error?: string };

function parseClient(formData: FormData) {
  return {
    full_name: String(formData.get("full_name") || "").trim(),
    phone: String(formData.get("phone") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    address: String(formData.get("address") || "").trim() || null,
    country: String(formData.get("country") || "").trim() || null,
    id_number: String(formData.get("id_number") || "").trim() || null,
    license_number: String(formData.get("license_number") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
  };
}

export async function createClientRecord(
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const business = await requireBusiness();
  const data = parseClient(formData);
  if (!data.full_name) return { error: "Client name is required." };

  const supabase = createSupabase();
  const { error } = await supabase.from("clients").insert({ business_id: business.id, ...data });
  if (error) return { error: error.message };

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateClientRecord(
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  await requireBusiness();
  const id = String(formData.get("id") || "");
  if (!id) return { error: "Missing client id." };

  const data = parseClient(formData);
  if (!data.full_name) return { error: "Client name is required." };

  const supabase = createSupabase();
  const { error } = await supabase
    .from("clients")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}
