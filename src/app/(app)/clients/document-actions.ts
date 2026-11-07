"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/business";

const BUCKET = "site";

export type ClientDoc = { url: string; label: string };
export type DocResult = { ok: boolean; documents?: ClientDoc[]; error?: string };

// Confirms the client exists AND belongs to the caller's business, returning
// its current document list. Throws "FORBIDDEN" otherwise so a crafted call
// can't touch another business's client.
async function ownedDocs(admin: any, clientId: string, businessId: string): Promise<ClientDoc[]> {
  const { data } = await admin.from("clients").select("documents, business_id").eq("id", clientId).maybeSingle();
  if (!data || data.business_id !== businessId) throw new Error("FORBIDDEN");
  const d = data.documents;
  return Array.isArray(d) ? d : [];
}

async function saveDocs(admin: any, clientId: string, businessId: string, documents: ClientDoc[]) {
  await admin.from("clients").update({ documents }).eq("id", clientId).eq("business_id", businessId);
}

function fail(e: any): DocResult {
  if (e?.message === "NO_BUSINESS") return { ok: false, error: "Please sign in again." };
  if (e?.message === "FORBIDDEN") return { ok: false, error: "That client was not found." };
  return { ok: false, error: e?.message || "Something went wrong." };
}

export async function addClientDocument(clientId: string, dataUrl: string, label: string): Promise<DocResult> {
  try {
    if (!clientId || !dataUrl) return { ok: false, error: "Missing data." };
    const business = await requireBusiness();
    const admin = createAdminClient();

    const existing = await ownedDocs(admin, clientId, business.id);

    const comma = dataUrl.indexOf(",");
    const meta = comma === -1 ? "" : dataUrl.slice(0, comma);
    const b64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
    const isPng = /image\/png/.test(meta);
    const ext = isPng ? "png" : "jpg";
    const contentType = isPng ? "image/png" : "image/jpeg";
    const buf = Buffer.from(b64, "base64");

    if (buf.length > 6 * 1024 * 1024) return { ok: false, error: "Image too large (max ~6MB)." };

    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `clients/${clientId}/${name}`;

    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, { contentType, upsert: false });
    if (upErr) return { ok: false, error: upErr.message };

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const safeLabel = ["id", "license", "other"].includes(label) ? label : "other";
    const documents = [...existing, { url: pub.publicUrl, label: safeLabel }];
    await saveDocs(admin, clientId, business.id, documents);

    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/clients");
    return { ok: true, documents };
  } catch (e: any) {
    return fail(e);
  }
}

export async function removeClientDocument(clientId: string, url: string): Promise<DocResult> {
  try {
    if (!clientId) return { ok: false, error: "Missing client." };
    const business = await requireBusiness();
    const admin = createAdminClient();

    let documents = await ownedDocs(admin, clientId, business.id);
    documents = documents.filter((d) => d.url !== url);
    await saveDocs(admin, clientId, business.id, documents);

    // best-effort delete from storage
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const key = url.slice(idx + marker.length);
      await admin.storage.from(BUCKET).remove([key]);
    }

    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/clients");
    return { ok: true, documents };
  } catch (e: any) {
    return fail(e);
  }
}
