"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";

export async function deleteReview(formData: FormData) {
  const business = await requireBusiness();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (id) await supabase.from("reviews").delete().eq("id", id).eq("business_id", business.id);
  revalidatePath("/reviews");
  revalidatePath("/settings");
}
