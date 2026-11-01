import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// Best client IP from the proxy headers (Vercel sets x-forwarded-for).
export function clientIp(): string {
  const h = headers();
  const fwd = h.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export type RateResult = { allowed: boolean; retryAfter: number };

// Counts one hit for `key` within `windowSec`. Fails OPEN (allows) on any error
// so a missing migration or DB hiccup never blocks legitimate auth.
export async function rateLimit(key: string, max: number, windowSec: number): Promise<RateResult> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("rate_limit_hit", {
      p_key: key,
      p_max: max,
      p_window: windowSec,
    });
    if (error || !data) return { allowed: true, retryAfter: 0 };
    const row = Array.isArray(data) ? data[0] : data;
    return { allowed: !!row?.allowed, retryAfter: Number(row?.retry_after ?? 0) };
  } catch {
    return { allowed: true, retryAfter: 0 };
  }
}

// Albanian "try again in N minutes/seconds" message.
export function retryMessage(retryAfter: number): string {
  if (retryAfter >= 60) {
    const mins = Math.ceil(retryAfter / 60);
    return `Shumë përpjekje. Provo përsëri pas ${mins} minutash.`;
  }
  return `Shumë përpjekje. Provo përsëri pas pak.`;
}
