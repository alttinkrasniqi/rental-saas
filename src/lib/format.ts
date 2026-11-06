import {
  differenceInCalendarDays,
  format,
  parseISO,
} from "date-fns";
import type { PaymentState, Rental, RentalStatus } from "./types";

// ---------- Money ----------
// All money is stored as integer "cents" (minor units) to avoid rounding bugs.

export function centsToNumber(cents: number): number {
  return Math.round(cents) / 100;
}

export function numberToCents(value: number): number {
  return Math.round(value * 100);
}

export function formatMoney(cents: number, currency = "EUR"): string {
  const amount = centsToNumber(cents);
  try {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// ---------- Dates ----------

export function toDate(value: string | Date): Date {
  return typeof value === "string" ? parseISO(value) : value;
}

export function formatDate(value: string | Date): string {
  return format(toDate(value), "dd/MM/yyyy");
}

export function formatDateTime(value: string | Date): string {
  return format(toDate(value), "dd/MM/yyyy, HH:mm");
}

export function formatTime(value: string | Date): string {
  return format(toDate(value), "HH:mm");
}

// Number of rental days. A same-day pickup/return counts as 1 day, and any
// partial extra day rounds up (standard rental-industry behaviour).
export function rentalDays(pickup: string | Date, ret: string | Date): number {
  const days = differenceInCalendarDays(toDate(ret), toDate(pickup));
  return Math.max(1, days);
}

// ---------- Payment state (derived, never stored) ----------

export function paymentState(rental: Pick<Rental, "paid_cents" | "total_cents">): PaymentState {
  if (rental.paid_cents >= rental.total_cents && rental.total_cents > 0) return "PAID";
  if (rental.paid_cents <= 0) return "UNPAID";
  return "PARTIAL";
}

export function remainingCents(rental: Pick<Rental, "paid_cents" | "total_cents">): number {
  return Math.max(0, rental.total_cents - rental.paid_cents);
}

// ---------- Effective rental status (derived) ----------
// The stored status is set once, at creation: RESERVED if the pickup date is
// still in the future, ACTIVE if it has already arrived. A reservation whose
// pickup day later passes is, in reality, active (the car is out) — but the
// stored value never changes on its own. This derives the real status for
// display, filtering, counts and reports everywhere, so a reservation flips to
// "active" automatically the day it starts. Terminal states (COMPLETED,
// CANCELLED) are always returned as-is.
export function effectiveStatus(
  rental: Pick<Rental, "status" | "pickup_at">,
  at: Date = new Date()
): RentalStatus {
  if (rental.status === "RESERVED" && toDate(rental.pickup_at).getTime() <= at.getTime()) {
    return "ACTIVE";
  }
  return rental.status;
}
