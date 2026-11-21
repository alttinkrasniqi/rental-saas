"use server";

import { revalidatePath } from "next/cache";
import { issueInvoice } from "@/app/invoice/[id]/actions";

// Issue an invoice (assign the next number) straight from the register, without
// opening the document. Delegates to the existing issueInvoice so numbering
// stays in one place.
export async function issueFromRegister(formData: FormData) {
  const rentalId = String(formData.get("rental_id") || "");
  if (!rentalId) return;
  await issueInvoice(rentalId);
  revalidatePath("/invoices");
}
