// One place for the product's own name and base URL.
// Change APP_NAME here (or set NEXT_PUBLIC_APP_NAME) to rebrand the whole app.
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "RentFlow";

// Public base URL of this deployment, e.g. https://app.yourproduct.com
// Used to build absolute links (booking-page links, email buttons).
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");

// Support contact for the in-app help bubble.
// Set these in Vercel: NEXT_PUBLIC_SUPPORT_WHATSAPP (digits only, incl. country
// code, e.g. 38344123456) and NEXT_PUBLIC_SUPPORT_EMAIL.
export const SUPPORT_WHATSAPP = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/[^0-9]/g, "");
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";

// The public booking page for a given business slug.
export function publicBookingPath(slug: string): string {
  return `/s/${slug}`;
}
export function publicBookingUrl(slug: string): string {
  return APP_URL ? `${APP_URL}/s/${slug}` : `/s/${slug}`;
}
