import type { RentalStatus, VehicleStatus, PaymentState, PaymentMethod } from "./types";

// Status badge styling. Colors carry consistent meaning across the whole app.
export const VEHICLE_STATUS_META: Record<
  VehicleStatus,
  { label: string; badge: string; dot: string }
> = {
  AVAILABLE: { label: "Available", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  RENTED: { label: "Rented", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  RESERVED: { label: "Reserved", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  MAINTENANCE: { label: "Maintenance", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  UNAVAILABLE: { label: "Unavailable", badge: "bg-slate-200 text-slate-600", dot: "bg-slate-400" },
};

export const RENTAL_STATUS_META: Record<
  RentalStatus,
  { label: string; badge: string }
> = {
  RESERVED: { label: "Reserved", badge: "bg-amber-100 text-amber-700" },
  ACTIVE: { label: "Active", badge: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Completed", badge: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Cancelled", badge: "bg-slate-200 text-slate-600" },
};

export const PAYMENT_STATE_META: Record<
  PaymentState,
  { label: string; badge: string }
> = {
  PAID: { label: "Paid", badge: "bg-emerald-100 text-emerald-700" },
  PARTIAL: { label: "Partially paid", badge: "bg-amber-100 text-amber-700" },
  UNPAID: { label: "Unpaid", badge: "bg-rose-100 text-rose-700" },
};

export const VEHICLE_STATUSES: VehicleStatus[] = [
  "AVAILABLE",
  "RENTED",
  "RESERVED",
  "MAINTENANCE",
  "UNAVAILABLE",
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "OTHER", label: "Other" },
];

export const FUEL_TYPES = ["Petrol", "Diesel", "Hybrid", "Electric", "LPG"];
export const TRANSMISSIONS = ["Manual", "Automatic"];
