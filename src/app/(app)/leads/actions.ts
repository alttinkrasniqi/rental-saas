"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";

const STATUSES = ["new", "contacted", "converted", "closed"];

export async function setLeadStatus(formData: FormData) {
  const business = await requireBusiness();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (id && STATUSES.includes(status)) {
    await supabase.from("leads").update({ status }).eq("id", id).eq("business_id", business.id);
  }
  revalidatePath("/leads");
  revalidatePath("/dashboard");
}

export async function addManualLead(formData: FormData) {
  const business = await requireBusiness();
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const note = String(formData.get("note") || "").trim() || null;
  if (name) {
    await supabase.from("leads").insert({ business_id: business.id, name, phone, note, status: "new", source: "manual" });
  }
  revalidatePath("/leads");
  revalidatePath("/dashboard");
}

export async function deleteLead(formData: FormData) {
  const business = await requireBusiness();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (id) await supabase.from("leads").delete().eq("id", id).eq("business_id", business.id);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
}
