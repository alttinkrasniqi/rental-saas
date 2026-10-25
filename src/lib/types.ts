// Domain types mirroring the database tables (snake_case columns).

export type VehicleStatus =
  | "AVAILABLE"
  | "RENTED"
  | "RESERVED"
  | "MAINTENANCE"
  | "UNAVAILABLE";

export type RentalStatus = "RESERVED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "OTHER";

export type PaymentState = "PAID" | "PARTIAL" | "UNPAID";

export interface Business {
  id: string;
  owner_id: string;
  slug: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  currency: string;
  timezone: string;
  welcome_seen?: boolean;
  created_at: string;
}

export interface Vehicle {
  id: string;
  business_id: string;
  make: string;
  model: string;
  year: number | null;
  plate: string;
  color: string | null;
  fuel_type: string | null;
  transmission: string | null;
  mileage: number | null;
  seats: number | null;
  doors: number | null;
  daily_price_cents: number;
  status: VehicleStatus;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  business_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  country: string | null;
  id_number: string | null;
  license_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Rental {
  id: string;
  business_id: string;
  vehicle_id: string;
  client_id: string;
  status: RentalStatus;
  pickup_at: string;
  return_at: string;
  daily_rate_cents: number;
  total_cents: number;
  deposit_cents: number;
  paid_cents: number;
  payment_method: PaymentMethod | null;
  returned_at: string | null;
  return_mileage: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  business_id: string;
  rental_id: string;
  amount_cents: number;
  method: PaymentMethod | null;
  paid_at: string;
  note: string | null;
}

// Rental joined with its vehicle and client (used in lists / calendar / detail).
export interface RentalWithRefs extends Rental {
  vehicle: Vehicle | null;
  client: Client | null;
}
