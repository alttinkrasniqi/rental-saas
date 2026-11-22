// Server-only helper for vehicle documents (registration, insurance, inspection,
// purchase). Files live in a PRIVATE Supabase Storage bucket; we store only the
// storage *path* in vehicles.documents and hand out short-lived SIGNED URLs for
// viewing — never a public URL. Mirrors src/lib/client-docs.ts.
import { createAdminClient } from "@/lib/supabase/admin";

export const VEHICLE_DOCS_BUCKET = "vehicle-docs"; // must be a PRIVATE bucket
const SIGN_TTL = 60 * 60; // 1 hour

export type StoredDoc = { path: string; label: string };
export type SignedDoc = { path: string; label: string; url: string };

export const VEHICLE_DOC_LABELS = ["registration", "insurance", "inspection", "purchase", "other"] as const;

export async function signVehicleDocs(docs: any[]): Promise<SignedDoc[]> {
  if (!Array.isArray(docs) || docs.length === 0) return [];
  const admin = createAdminClient();
  const out: SignedDoc[] = [];
  for (const d of docs) {
    if (!d) continue;
    if (d.path) {
      const { data } = await admin.storage.from(VEHICLE_DOCS_BUCKET).createSignedUrl(d.path, SIGN_TTL);
      out.push({ path: d.path, label: d.label ?? "other", url: data?.signedUrl ?? "" });
    } else if (d.url) {
      out.push({ path: "", label: d.label ?? "other", url: d.url });
    }
  }
  return out;
}
