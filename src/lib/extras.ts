// Portable extras/fees logic (2.H.6) — no Next/React imports so it can be
// reused server- and client-side. An "extra" is an optional charge added on top
// of the rental price: extra driver, delivery, cleaning, child seat, etc.

export type ExtraKind = "flat" | "per_day";

// A catalog entry the business configures in Settings.
export interface ExtraDef {
  id: string;
  name: string;
  kind: ExtraKind;
  unit_cents: number;
}

// A chosen extra, snapshotted onto a rental (survives later catalog edits).
export interface ExtraItem {
  name: string;
  kind: ExtraKind;
  unit_cents: number;
  qty: number;
  amount_cents: number;
}

export function extraAmount(kind: ExtraKind, unitCents: number, qty: number): number {
  const q = kind === "flat" ? Math.max(1, Math.round(qty || 1)) : Math.max(0, Math.round(qty || 0));
  return Math.max(0, Math.round((unitCents || 0) * q));
}

// How many units an extra defaults to when first ticked on a rental of `days`.
export function defaultQty(kind: ExtraKind, days: number): number {
  return kind === "per_day" ? Math.max(1, days || 1) : 1;
}

export function extrasSum(items: ExtraItem[] | null | undefined): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((s, x) => s + Math.max(0, Math.round(x?.amount_cents || 0)), 0);
}

// Normalize posted/stored extras: drop junk, recompute each amount so the total
// can always be trusted regardless of what the client sent.
export function sanitizeExtras(raw: unknown): ExtraItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ExtraItem[] = [];
  for (const r of raw as any[]) {
    const name = String(r?.name ?? "").trim();
    if (!name) continue;
    const kind: ExtraKind = r?.kind === "per_day" ? "per_day" : "flat";
    const unit = Math.max(0, Math.round(Number(r?.unit_cents) || 0));
    const qty = Math.max(0, Math.round(Number(r?.qty) || 0));
    const amount = extraAmount(kind, unit, qty);
    if (amount <= 0) continue;
    out.push({ name, kind, unit_cents: unit, qty, amount_cents: amount });
  }
  return out;
}
