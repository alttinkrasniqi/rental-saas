// Shared site-content types used by BOTH the Website Builder (admin)
// and the public booking site, so they never drift apart.

export type Feature = { title: string; text: string };
export type Offer = {
  id: string;
  title: string;
  body: string;
  badge: string;
  active: boolean;
};
export type Review = { id: string; name: string; text: string; rating: number };

export type SiteSettings = {
  hero: {
    badge: string;
    titleLead: string;
    titleHighlight: string;
    titleTail: string;
    subtitle: string;
  };
  cta: { title: string; text: string };
  features: Feature[];
  offers: Offer[];
  reviews: Review[];
  hours: string;
  mapQuery: string;
  show: {
    features: boolean;
    offers: boolean;
    how: boolean;
    reviews: boolean;
    map: boolean;
  };
};

export const defaultSettings: SiteSettings = {
  hero: {
    badge: "Reserve online in under a minute",
    titleLead: "Rent a car the",
    titleHighlight: "easy",
    titleTail: " way.",
    subtitle:
      "Pick your dates, choose from our fleet and reserve in seconds. No online payment — just reserve and pay on pickup.",
  },
  cta: {
    title: "Ready to hit the road?",
    text: "Find your car in seconds and reserve with zero hassle.",
  },
  features: [
    { title: "Modern fleet", text: "Well-kept, recent vehicles for every need and budget." },
    { title: "Fully insured", text: "Every rental comes insured, so you drive with peace of mind." },
    { title: "24/7 support", text: "We're a message away before, during and after your rental." },
    { title: "Flexible pickup", text: "City or airport pickup and delivery — just ask." },
  ],
  offers: [],
  reviews: [],
  hours: "",
  mapQuery: "",
  show: { features: true, offers: true, how: true, reviews: true, map: true },
};

// Fill any missing keys from defaults so old/partial data never breaks the site.
export function mergeSettings(data: any): SiteSettings {
  const d = defaultSettings;
  const s = data && typeof data === "object" ? data : {};
  return {
    hero: { ...d.hero, ...(s.hero || {}) },
    cta: { ...d.cta, ...(s.cta || {}) },
    features:
      Array.isArray(s.features) && s.features.length ? s.features : d.features,
    offers: Array.isArray(s.offers) ? s.offers : d.offers,
    reviews: Array.isArray(s.reviews) ? s.reviews : d.reviews,
    hours: typeof s.hours === "string" ? s.hours : d.hours,
    mapQuery: typeof s.mapQuery === "string" ? s.mapQuery : d.mapQuery,
    show: { ...d.show, ...(s.show || {}) },
  };
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
