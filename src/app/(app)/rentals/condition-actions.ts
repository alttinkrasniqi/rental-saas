"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/business";

const BUCKET = "site";
export type Phase = "pickup" | "return";
export type ConditionResult = { ok: boolean; photos?: string[]; error?: string };

function fail(e: any): ConditionResult {
  if (e?.message === "NO_BUSINESS") return { ok: false, error: "Please sign in again." };
  if (e?.message === "FORBIDDEN") return { ok: false, error: "That rental was not found." };
  return { ok: false, error: e?.message || "Something went wrong." };
}

// Confirms the rental belongs to the caller's business before any write — so a
// crafted call can't touch another business's rental (SEC-01).
async function assertOwnRental(admin: any, rentalId: string, businessId: string) {
  const { data } = await admin
    .from("rentals")
    .select("id, business_id")
    .eq("id", rentalId)
    .maybeSingle();
  if (!data || data.business_id !== businessId) throw new Error("FORBIDDEN");
}

async function getRow(admin: any, rentalId: string, phase: Phase) {
  const { data } = await admin
    .from("rental_conditions")
    .select("*")
    .eq("rental_id", rentalId)
    .eq("phase", phase)
    .maybeSingle();
  return data as any;
}

async function photosOf(admin: any, rentalId: string, phase: Phase): Promise<string[]> {
  const row = await getRow(admin, rentalId, phase);
  const p = row?.photos;
  return Array.isArray(p) ? p : [];
}

export async function saveConditionDetails(
  rentalId: string,
  phase: Phase,
  details: { fuel: number | null; odometer: number | null; notes: string | null }
): Promise<ConditionResult> {
  try {
    if (!rentalId || (phase !== "pickup" && phase !== "return")) return { ok: false, error: "Missing data." };
    const business = await requireBusiness();
    const admin = createAdminClient();
    await assertOwnRental(admin, rentalId, business.id);

    const existing = await getRow(admin, rentalId, phase);
    const patch = {
      fuel: details.fuel,
      odometer: details.odometer,
      notes: details.notes,
      updated_at: new Date().toISOString(),
    };
    if (existing) {
      const { error } = await admin.from("rental_conditions").update(patch).eq("id", existing.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await admin.from("rental_conditions").insert({
        rental_id: rentalId,
        business_id: business.id,
        phase,
        photos: [],
        ...patch,
      });
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath(`/rentals/${rentalId}`);
    return { ok: true };
  } catch (e: any) {
    return fail(e);
  }
}

export async function addConditionPhoto(
  rentalId: string,
  phase: Phase,
  dataUrl: string
): Promise<ConditionResult> {
  try {
    if (!rentalId || !dataUrl || (phase !== "pickup" && phase !== "return")) return { ok: false, error: "Missing data." };
    const business = await requireBusiness();
    const admin = createAdminClient();
    await assertOwnRental(admin, rentalId, business.id);

    const existing = await photosOf(admin, rentalId, phase);

    const comma = dataUrl.indexOf(",");
    const meta = comma === -1 ? "" : dataUrl.slice(0, comma);
    const b64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
    const isPng = /image\/png/.test(meta);
    const ext = isPng ? "png" : "jpg";
    const contentType = isPng ? "image/png" : "image/jpeg";
    const buf = Buffer.from(b64, "base64");
    if (buf.length > 6 * 1024 * 1024) return { ok: false, error: "Image too large (max ~6MB)." };

    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `conditions/${rentalId}/${phase}/${name}`;

    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, { contentType, upsert: false });
    if (upErr) return { ok: false, error: upErr.message };

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const photos = [...existing, pub.publicUrl];

    const row = await getRow(admin, rentalId, phase);
    if (row) {
      await admin.from("rental_conditions").update({ photos, updated_at: new Date().toISOString() }).eq("id", row.id);
    } else {
      await admin.from("rental_conditions").insert({
        rental_id: rentalId,
        business_id: business.id,
        phase,
        photos,
      });
    }

    revalidatePath(`/rentals/${rentalId}`);
    return { ok: true, photos };
  } catch (e: any) {
    return fail(e);
  }
}

export async function removeConditionPhoto(
  rentalId: string,
  phase: Phase,
  url: string
): Promise<ConditionResult> {
  try {
    if (!rentalId || !url) return { ok: false, error: "Missing data." };
    const business = await requireBusiness();
    const admin = createAdminClient();
    await assertOwnRental(admin, rentalId, business.id);

    const existing = await photosOf(admin, rentalId, phase);
    const photos = existing.filter((u) => u !== url);

    const row = await getRow(admin, rentalId, phase);
    if (row) {
      await admin.from("rental_conditions").update({ photos, updated_at: new Date().toISOString() }).eq("id", row.id);
    }

    // best-effort delete from storage
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const key = url.slice(idx + marker.length);
      await admin.storage.from(BUCKET).remove([key]);
    }

    revalidatePath(`/rentals/${rentalId}`);
    return { ok: true, photos };
  } catch (e: any) {
    return fail(e);
  }
}
