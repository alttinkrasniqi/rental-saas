import {
  differenceInCalendarDays,
  format,
  parseISO,
} from "date-fns";
import type { PaymentState, Rental } from "./types";

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
  return format(toDate(value), "d MMM yyyy");
}

export function formatDateTime(value: string | Date): string {
  return format(toDate(value), "d MMM yyyy, HH:mm");
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
