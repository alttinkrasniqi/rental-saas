"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";

// Assigns the next sequential invoice number for this business (no gaps) and
// stamps the issue time. Idempotent: if already issued, it keeps the number.
export async function issueInvoice(rentalId: string): Promise<{ ok?: boolean; error?: string }> {
  const business = await requireBusiness();
  const supabase = createClient();

  const { data: r } = await supabase
    .from("rentals")
    .select("invoice_no")
    .eq("id", rentalId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!r) return { error: "Nuk u gjet rezervimi." };
  if (r.invoice_no != null) return { ok: true };

  const { data: last } = await supabase
    .from("rentals")
    .select("invoice_no")
    .eq("business_id", business.id)
    .not("invoice_no", "is", null)
    .order("invoice_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  const next = (last?.invoice_no ?? 0) + 1;

  const { error } = await supabase
    .from("rentals")
    .update({ invoice_no: next, invoice_issued_at: new Date().toISOString() })
    .eq("id", rentalId)
    .eq("business_id", business.id);
  if (error) return { error: "Nuk u lëshua dot fatura." };

  revalidatePath(`/invoice/${rentalId}`);
  return { ok: true };
}
