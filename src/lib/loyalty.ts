// 2.V.5 Win-back & loyalty — pure aggregation (principle H: no Next/DOM).
// Turns a business's clients + rentals into two actionable lists:
//  - VIP ("klientë të artë"): repeat customers worth rewarding.
//  - Win-back: past customers who haven't rented in a while and aren't out now.

export interface RentalLite {
  client_id: string;
  status: string;                 // RESERVED | ACTIVE | COMPLETED | CANCELLED
  paid_cents: number | null;
  total_cents: number | null;
  pickup_at: string;
  return_at: string;
  open_ended?: boolean | null;
}
export interface ClientLite { id: string; full_name: string; phone: string | null; email: string | null; }

export interface ClientStat {
  id: string; name: string; phone: string | null; email: string | null;
  count: number; spentCents: number; lastAt: string | null; daysSince: number | null; hasOpen: boolean;
}
export interface LoyaltySettings { minRentals: number; winbackDays: number; discountPct: number; }

export const DEFAULT_LOYALTY: LoyaltySettings = { minRentals: 3, winbackDays: 60, discountPct: 10 };

export function computeLoyalty(clients: ClientLite[], rentals: RentalLite[], settings: LoyaltySettings, nowMs: number): { vip: ClientStat[]; winback: ClientStat[] } {
  const by = new Map<string, ClientStat>();
  for (const c of clients) by.set(c.id, { id: c.id, name: c.full_name, phone: c.phone, email: c.email, count: 0, spentCents: 0, lastAt: null, daysSince: null, hasOpen: false });

  for (const r of rentals) {
    const s = by.get(r.client_id); if (!s) continue;
    if (r.status === "CANCELLED") continue;
    s.count += 1;
    s.spentCents += r.paid_cents ?? 0;
    if (!s.lastAt || r.pickup_at > s.lastAt) s.lastAt = r.pickup_at;
    const ret = r.return_at ? Date.parse(r.return_at) : 0;
    const pick = r.pickup_at ? Date.parse(r.pickup_at) : 0;
    if (r.open_ended && r.status !== "COMPLETED") s.hasOpen = true;
    else if (ret >= nowMs) s.hasOpen = true;   // ongoing or returns in the future
    else if (pick >= nowMs) s.hasOpen = true;  // upcoming reservation
  }

  const all = [...by.values()];
  for (const s of all) s.daysSince = s.lastAt ? Math.floor((nowMs - Date.parse(s.lastAt)) / 86400000) : null;

  const vip = all
    .filter((s) => s.count >= settings.minRentals)
    .sort((a, b) => b.count - a.count || b.spentCents - a.spentCents);

  const winback = all
    .filter((s) => s.count >= 1 && !s.hasOpen && s.daysSince != null && s.daysSince >= settings.winbackDays)
    .sort((a, b) => (b.daysSince ?? 0) - (a.daysSince ?? 0));

  return { vip, winback };
}

// wa.me target from a stored phone. Kosovo default: a leading 0 → 383.
export function waNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = String(phone).replace(/[^0-9]/g, "");
  if (!d) return null;
  if (d.startsWith("0")) d = "383" + d.slice(1);
  return d;
}
