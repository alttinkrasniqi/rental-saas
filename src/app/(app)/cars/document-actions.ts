"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/business";
import { VEHICLE_DOCS_BUCKET, VEHICLE_DOC_LABELS, signVehicleDocs, type StoredDoc, type SignedDoc } from "@/lib/vehicle-docs";

export type DocResult = { ok: boolean; documents?: SignedDoc[]; error?: string };

async function ownedDocs(admin: any, vehicleId: string, businessId: string): Promise<StoredDoc[]> {
  const { data } = await admin.from("vehicles").select("documents, business_id").eq("id", vehicleId).maybeSingle();
  if (!data || data.business_id !== businessId) throw new Error("FORBIDDEN");
  const d = data.documents;
  return Array.isArray(d) ? d : [];
}

async function saveDocs(admin: any, vehicleId: string, businessId: string, documents: StoredDoc[]) {
  await admin.from("vehicles").update({ documents }).eq("id", vehicleId).eq("business_id", businessId);
}

function fail(e: any): DocResult {
  if (e?.message === "NO_BUSINESS") return { ok: false, error: "Please sign in again." };
  if (e?.message === "FORBIDDEN") return { ok: false, error: "That car was not found." };
  return { ok: false, error: e?.message || "Something went wrong." };
}

export async function addVehicleDocument(vehicleId: string, dataUrl: string, label: string): Promise<DocResult> {
  try {
    if (!vehicleId || !dataUrl) return { ok: false, error: "Missing data." };
    const business = await requireBusiness();
    const admin = createAdminClient();

    const existing = await ownedDocs(admin, vehicleId, business.id);

    const comma = dataUrl.indexOf(",");
    const meta = comma === -1 ? "" : dataUrl.slice(0, comma);
    const b64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
    const isPng = /image\/png/.test(meta);
    const ext = isPng ? "png" : "jpg";
    const contentType = isPng ? "image/png" : "image/jpeg";
    const buf = Buffer.from(b64, "base64");

    if (buf.length > 6 * 1024 * 1024) return { ok: false, error: "Image too large (max ~6MB)." };
    if (existing.length >= 20) return { ok: false, error: "Too many documents (max 20)." };

    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `${business.id}/${vehicleId}/${name}`;

    const { error: upErr } = await admin.storage.from(VEHICLE_DOCS_BUCKET).upload(path, buf, { contentType, upsert: false });
    if (upErr) return { ok: false, error: upErr.message };

    const safeLabel = (VEHICLE_DOC_LABELS as readonly string[]).includes(label) ? label : "other";
    const documents: StoredDoc[] = [...existing, { path, label: safeLabel }];
    await saveDocs(admin, vehicleId, business.id, documents);

    revalidatePath(`/cars/${vehicleId}`);
    return { ok: true, documents: await signVehicleDocs(documents) };
  } catch (e: any) {
    return fail(e);
  }
}

export async function removeVehicleDocument(vehicleId: string, path: string): Promise<DocResult> {
  try {
    if (!vehicleId) return { ok: false, error: "Missing car." };
    const business = await requireBusiness();
    const admin = createAdminClient();

    const existing = await ownedDocs(admin, vehicleId, business.id);
    const documents = existing.filter((d) => d.path !== path);
    await saveDocs(admin, vehicleId, business.id, documents);

    if (path) await admin.storage.from(VEHICLE_DOCS_BUCKET).remove([path]);

    revalidatePath(`/cars/${vehicleId}`);
    return { ok: true, documents: await signVehicleDocs(documents) };
  } catch (e: any) {
    return fail(e);
  }
}
