"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/business";

const BUCKET = "site";

// Confirms the car exists AND belongs to the caller's business, returning its
// current photo list. Throws "FORBIDDEN" if the car isn't theirs — so a crafted
// call can't touch photos on another business's vehicle.
async function ownedPhotos(admin: any, vehicleId: string, businessId: string): Promise<string[]> {
  const { data } = await admin
    .from("vehicles")
    .select("photos, business_id")
    .eq("id", vehicleId)
    .maybeSingle();
  if (!data || data.business_id !== businessId) throw new Error("FORBIDDEN");
  const p = data.photos;
  return Array.isArray(p) ? p : [];
}

async function savePhotos(admin: any, vehicleId: string, businessId: string, photos: string[]) {
  await admin
    .from("vehicles")
    .update({ photos })
    .eq("id", vehicleId)
    .eq("business_id", businessId);
}

export type PhotoResult = { ok: boolean; photos?: string[]; error?: string };

function fail(e: any): PhotoResult {
  if (e?.message === "NO_BUSINESS") return { ok: false, error: "Please sign in again." };
  if (e?.message === "FORBIDDEN") return { ok: false, error: "That car was not found." };
  return { ok: false, error: e?.message || "Something went wrong." };
}

export async function addCarPhoto(vehicleId: string, dataUrl: string): Promise<PhotoResult> {
  try {
    if (!vehicleId || !dataUrl) return { ok: false, error: "Missing data." };
    const business = await requireBusiness();
    const admin = createAdminClient();

    // Verify ownership before doing any work / upload.
    const existing = await ownedPhotos(admin, vehicleId, business.id);

    const comma = dataUrl.indexOf(",");
    const meta = comma === -1 ? "" : dataUrl.slice(0, comma);
    const b64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
    const isPng = /image\/png/.test(meta);
    const ext = isPng ? "png" : "jpg";
    const contentType = isPng ? "image/png" : "image/jpeg";
    const buf = Buffer.from(b64, "base64");

    if (buf.length > 6 * 1024 * 1024) return { ok: false, error: "Image too large (max ~6MB)." };

    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `cars/${vehicleId}/${name}`;

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, buf, { contentType, upsert: false });
    if (upErr) return { ok: false, error: upErr.message };

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const photos = [...existing, pub.publicUrl];
    await savePhotos(admin, vehicleId, business.id, photos);

    revalidatePath("/website");
    revalidatePath("/s/[slug]", "page");
    return { ok: true, photos };
  } catch (e: any) {
    return fail(e);
  }
}

export async function removeCarPhoto(vehicleId: string, url: string): Promise<PhotoResult> {
  try {
    if (!vehicleId) return { ok: false, error: "Missing car." };
    const business = await requireBusiness();
    const admin = createAdminClient();

    let photos = await ownedPhotos(admin, vehicleId, business.id);
    photos = photos.filter((u) => u !== url);
    await savePhotos(admin, vehicleId, business.id, photos);

    // best-effort delete from storage
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const key = url.slice(idx + marker.length);
      await admin.storage.from(BUCKET).remove([key]);
    }

    revalidatePath("/website");
    revalidatePath("/s/[slug]", "page");
    return { ok: true, photos };
  } catch (e: any) {
    return fail(e);
  }
}

export async function makeCoverPhoto(vehicleId: string, url: string): Promise<PhotoResult> {
  try {
    if (!vehicleId) return { ok: false, error: "Missing car." };
    const business = await requireBusiness();
    const admin = createAdminClient();

    let photos = await ownedPhotos(admin, vehicleId, business.id);
    photos = [url, ...photos.filter((u) => u !== url)];
    await savePhotos(admin, vehicleId, business.id, photos);

    revalidatePath("/website");
    revalidatePath("/s/[slug]", "page");
    return { ok: true, photos };
  } catch (e: any) {
    return fail(e);
  }
}
