// SINGLE SOURCE OF TRUTH for "is a car busy?" used by every screen
// (Cars list, car detail, dashboard, calendar, new rental).
//
// Rules:
//  - A rental "holds" a car only while it is OPEN = status ACTIVE or RESERVED.
//    Returned (COMPLETED) and CANCELLED rentals never hold a car.
//  - A car is OUT/RENTED now if it has an open rental whose pickup has arrived.
//    It stays out until someone marks it returned (status -> COMPLETED), even if
//    the scheduled return date has passed (that case shows as overdue elsewhere).
//  - A car is RESERVED if its only open rental is a future one (pickup ahead).
//  - Manual MAINTENANCE / UNAVAILABLE always win over the computed value.

type R = {
  vehicle_id?: string | null;
  status?: string | null;
  pickup_at?: string | null;
  return_at?: string | null;
  open_ended?: boolean | null;
};

export function isOpenStatus(status: string | null | undefined): boolean {
  return status === "ACTIVE" || status === "RESERVED";
}

// Vehicle ids that are physically out right now.
export function carsOutNow(rentals: R[], now: Date = new Date()): Set<string> {
  const out = new Set<string>();
  for (const r of rentals) {
    if (!r.vehicle_id || !isOpenStatus(r.status)) continue;
    if (r.pickup_at && new Date(r.pickup_at) <= now) out.add(r.vehicle_id);
  }
  return out;
}

// Vehicle ids with a future open booking (and not already out now).
export function carsReservedSoon(
  rentals: R[],
  outNow: Set<string>,
  now: Date = new Date()
): Set<string> {
  const res = new Set<string>();
  for (const r of rentals) {
    if (!r.vehicle_id || outNow.has(r.vehicle_id) || !isOpenStatus(r.status)) continue;
    if (r.pickup_at && new Date(r.pickup_at) > now) res.add(r.vehicle_id);
  }
  return res;
}

// Final display status for one car.
export function liveVehicleStatus(
  rawStatus: string | null | undefined,
  vehicleId: string,
  outNow: Set<string>,
  reservedSoon: Set<string>
): string {
  if (rawStatus === "MAINTENANCE" || rawStatus === "UNAVAILABLE") return rawStatus;
  if (outNow.has(vehicleId)) return "RENTED";
  if (reservedSoon.has(vehicleId)) return "RESERVED";
  return "AVAILABLE";
}
