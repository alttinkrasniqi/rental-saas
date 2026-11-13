// Portable pricing logic — no Next/React imports, so GjejRent and the mobile
// apps can reuse it (roadmap principle H). Two pieces:
//   1. bestPrice: cheapest mix of month/week/day blocks for a length.
//   2. Scheduled price rules: time-boxed adjustments applied by pickup date.

export interface PriceRule {
  id: string;
  vehicle_id: string | null; // null = applies to all cars of the business
  label: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // null = from start_date onward, no end
  adjust_type: "percent" | "fixed_daily";
  adjust_value: number; // percent: e.g. 15 or -20 ; fixed_daily: price in cents
}

export interface Rates {
  daily: number;
  weekly: number | null;
  monthly: number | null;
}

// The rule in effect for a car on a given date. A car-specific rule beats a
// business-wide one; otherwise the most recently starting rule wins.
export function applicablePriceRule(
  rules: PriceRule[],
  vehicleId: string,
  dateStr: string
): PriceRule | null {
  if (!dateStr) return null;
  const m = rules.filter(
    (r) =>
      (r.vehicle_id === vehicleId || r.vehicle_id == null) &&
      r.start_date <= dateStr &&
      (r.end_date == null || r.end_date >= dateStr)
  );
  if (!m.length) return null;
  m.sort((a, b) => {
    const spec = (b.vehicle_id ? 1 : 0) - (a.vehicle_id ? 1 : 0);
    if (spec) return spec;
    return b.start_date.localeCompare(a.start_date);
  });
  return m[0];
}

// Apply a rule to a car's base rates, returning the effective rates.
export function effectiveRates(base: Rates, rule: PriceRule | null): Rates {
  if (!rule) return base;
  if (rule.adjust_type === "percent") {
    const f = 1 + rule.adjust_value / 100;
    return {
      daily: Math.max(0, Math.round(base.daily * f)),
      weekly: base.weekly ? Math.max(0, Math.round(base.weekly * f)) : base.weekly,
      monthly: base.monthly ? Math.max(0, Math.round(base.monthly * f)) : base.monthly,
    };
  }
  // fixed_daily: set the daily rate; scale any week/month tiers by the ratio.
  const nd = Math.max(0, rule.adjust_value);
  const ratio = base.daily > 0 ? nd / base.daily : 1;
  return {
    daily: nd,
    weekly: base.weekly ? Math.max(0, Math.round(base.weekly * ratio)) : base.weekly,
    monthly: base.monthly ? Math.max(0, Math.round(base.monthly * ratio)) : base.monthly,
  };
}

// Cheapest mix of month (30d) / week (7d) / day blocks that covers `days`.
// A block may over-cover (6 days can take a weekly rate if that's cheaper).
// Weekly/monthly of 0 or null means "not offered" for that tier.
export function bestPrice(
  days: number,
  dailyCents: number,
  weeklyCents?: number | null,
  monthlyCents?: number | null
): { cents: number; months: number; weeks: number; days: number } {
  if (days <= 0) return { cents: 0, months: 0, weeks: 0, days: 0 };
  const W = weeklyCents && weeklyCents > 0 ? weeklyCents : null;
  const M = monthlyCents && monthlyCents > 0 ? monthlyCents : null;
  const cost = new Array(days + 1).fill(Infinity);
  const how = new Array<{ from: number; add: "d" | "w" | "m" } | null>(days + 1).fill(null);
  cost[0] = 0;
  for (let n = 1; n <= days; n++) {
    if (cost[n - 1] + dailyCents < cost[n]) { cost[n] = cost[n - 1] + dailyCents; how[n] = { from: n - 1, add: "d" }; }
    if (W) { const p = Math.max(0, n - 7); if (cost[p] + W < cost[n]) { cost[n] = cost[p] + W; how[n] = { from: p, add: "w" }; } }
    if (M) { const p = Math.max(0, n - 30); if (cost[p] + M < cost[n]) { cost[n] = cost[p] + M; how[n] = { from: p, add: "m" }; } }
  }
  let n = days, months = 0, weeks = 0, d = 0;
  while (n > 0 && how[n]) {
    const h = how[n]!;
    if (h.add === "m") months++;
    else if (h.add === "w") weeks++;
    else d++;
    n = h.from;
  }
  return { cents: cost[days], months, weeks, days: d };
}
