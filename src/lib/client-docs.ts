// Server-only helper for client document photos (ID / passport / license).
//
// These are PII, so they live in a PRIVATE Supabase Storage bucket. We store
// only the storage *path* in clients.documents and hand out short-lived SIGNED
// URLs for viewing — never a public URL. Signing uses the service-role admin
// client, so no public access to the bucket is ever granted.
import { createAdminClient } from "@/lib/supabase/admin";

export const DOCS_BUCKET = "client-docs"; // must be a PRIVATE bucket
const SIGN_TTL = 60 * 60; // 1 hour

export type StoredDoc = { path: string; label: string };
export type SignedDoc = { path: string; label: string; url: string };

// Turn stored { path, label } docs into viewable { path, label, url } docs with
// time-limited signed URLs. Legacy rows that still carry a public `url` (from an
// earlier version) are passed through unsigned so they keep working.
export async function signClientDocs(docs: any[]): Promise<SignedDoc[]> {
  if (!Array.isArray(docs) || docs.length === 0) return [];
  const admin = createAdminClient();
  const out: SignedDoc[] = [];
  for (const d of docs) {
    if (!d) continue;
    if (d.path) {
      const { data } = await admin.storage.from(DOCS_BUCKET).createSignedUrl(d.path, SIGN_TTL);
      out.push({ path: d.path, label: d.label ?? "other", url: data?.signedUrl ?? "" });
    } else if (d.url) {
      out.push({ path: "", label: d.label ?? "other", url: d.url });
    }
  }
  return out;
}
