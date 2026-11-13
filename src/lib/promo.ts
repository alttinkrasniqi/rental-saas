// Portable discount-code evaluation — shared by the booking form (preview) and
// the server (authoritative apply on rental creation). No Next/React imports.

export interface PromoRow {
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number; // percent: 1..100 ; fixed: cents
  min_total_cents: number | null;
  valid_from: string | null; // YYYY-MM-DD
  valid_to: string | null;
  max_uses: number | null;
  used_count: number;
  active: boolean;
}

export type PromoEval = { ok: boolean; discountCents: number; error?: string };

// `today` is YYYY-MM-DD. Returns the discount in cents (capped at the total).
export function evalPromo(row: PromoRow, totalCents: number, today: string): PromoEval {
  if (!row.active) return { ok: false, discountCents: 0, error: "This code is turned off." };
  if (row.valid_from && today < row.valid_from) return { ok: false, discountCents: 0, error: "This code isn't active yet." };
  if (row.valid_to && today > row.valid_to) return { ok: false, discountCents: 0, error: "This code has expired." };
  if (row.max_uses != null && row.used_count >= row.max_uses) return { ok: false, discountCents: 0, error: "This code has reached its usage limit." };
  if (row.min_total_cents != null && totalCents < row.min_total_cents) return { ok: false, discountCents: 0, error: "The total is below this code's minimum." };

  let d = row.discount_type === "percent" ? Math.round((totalCents * row.discount_value) / 100) : row.discount_value;
  d = Math.max(0, Math.min(d, totalCents));
  return { ok: true, discountCents: d };
}
