// Shared shape for a car row in the Website Builder (one definition so the
// Builder and the WebsiteManager never drift apart).
export type CarRow = {
  id: string;
  make: string;
  model: string;
  plate: string;
  year: number | null;
  color: string | null;
  fuel_type: string | null;
  transmission: string | null;
  seats: number | null;
  doors: number | null;
  daily_price_cents: number;
  description: string | null;
  photos: string[];
};
