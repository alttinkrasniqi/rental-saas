"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";

export async function saveGoogleReview(formData: FormData) {
  const business = await requireBusiness();
  const supabase = createClient();
  let url = String(formData.get("google_review_url") || "").trim();
  if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
  await supabase.from("businesses").update({ google_review_url: url || null }).eq("id", business.id);
  revalidatePath("/settings");
}
