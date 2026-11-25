"use server";

import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";

export type SearchHit = {
  type: "client" | "car";
  id: string;
  title: string;
  subtitle: string;
};

// Global search across the owner's clients and cars. RLS scopes rows to the
// business; we only need an authenticated owner. Query is sanitized so it can't
// break the PostgREST or-filter syntax.
export async function globalSearch(qRaw: string): Promise<SearchHit[]> {
  const q = (qRaw || "").replace(/[,()*%]/g, " ").trim();
  if (q.length < 2) return [];
  await requireBusiness();
  const supabase = createClient();
  const like = `%${q}%`;

  const [{ data: clients }, { data: cars }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, full_name, phone")
      .eq("deleted", false)
      .or(`full_name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
      .order("full_name", { ascending: true })
      .limit(6),
    supabase
      .from("vehicles")
      .select("id, make, model, plate")
      .eq("archived", false)
      .or(`make.ilike.${like},model.ilike.${like},plate.ilike.${like}`)
      .order("make", { ascending: true })
      .limit(6),
  ]);

  const hits: SearchHit[] = [];
  for (const c of clients ?? []) hits.push({ type: "client", id: c.id, title: c.full_name, subtitle: c.phone || "" });
  for (const v of cars ?? []) hits.push({ type: "car", id: v.id, title: `${v.make} ${v.model}`, subtitle: v.plate });
  return hits;
}
