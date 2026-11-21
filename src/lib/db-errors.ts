// Shared detection for specific database errors we want to turn into friendly,
// localized messages instead of showing a raw Postgres string.

// True when an insert/update was rejected by the `rentals_no_overlap` exclusion
// constraint — i.e. the database caught a double-booking that slipped past the
// app-level check (a race between two near-simultaneous bookings). Postgres
// signals an exclusion violation with SQLSTATE 23P01.
export function isOverlapViolation(error: any): boolean {
  if (!error) return false;
  if (error.code === "23P01") return true;
  const blob = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`;
  return /rentals_no_overlap|exclusion constraint/i.test(blob);
}
