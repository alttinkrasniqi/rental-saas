// 2.V.2 Post Studio — pure, portable logic (principle H: no Next imports).
// Builds social-post badges + captions for a chosen car & occasion.
//
// AI SEAM (principle I): captions are template-based today. When we turn on an
// AI provider, swap buildCaptions() for an AI call behind the same signature —
// the UI and context shape do not change. Keep this module provider-agnostic.

export type PostOccasion = "available" | "offer" | "weekend" | "new" | "showcase";
export type PostLang = "sq" | "en";

export interface PostContext {
  businessName: string;
  make: string;
  model: string;
  year?: number | null;
  priceValue: string;     // already money-formatted by the caller, e.g. "€40"
  phone?: string | null;
  bookingUrl?: string | null;
  city?: string | null;
  transmission?: string | null;
  seats?: number | null;
  fuel?: string | null;
}

export interface OccasionDef {
  id: PostOccasion;
  labelEn: string;         // i18n source key for the picker button
  badge: Record<PostLang, string>;   // short text drawn on the image ("" = no badge)
  accent: string;          // default accent color for this occasion
}

export const OCCASIONS: OccasionDef[] = [
  { id: "available", labelEn: "Available now", badge: { sq: "I DISPONUESHËM", en: "AVAILABLE NOW" }, accent: "#1E9E6A" },
  { id: "offer",     labelEn: "Special offer", badge: { sq: "OFERTË SPECIALE", en: "SPECIAL OFFER" }, accent: "#B12A32" },
  { id: "weekend",   labelEn: "Weekend deal",  badge: { sq: "OFERTË FUNDJAVE", en: "WEEKEND DEAL" },  accent: "#C2410C" },
  { id: "new",       labelEn: "New in fleet",  badge: { sq: "I RI NË FLOTË",   en: "NEW IN FLEET" },  accent: "#1D4ED8" },
  { id: "showcase",  labelEn: "Showcase",      badge: { sq: "", en: "" },                              accent: "#0F172A" },
];

export function occasionById(id: PostOccasion): OccasionDef {
  return OCCASIONS.find((o) => o.id === id) ?? OCCASIONS[0];
}

export function badgeText(id: PostOccasion, lang: PostLang): string {
  return occasionById(id).badge[lang] ?? "";
}

// "Make Model (Year)" — year optional.
export function carTitle(ctx: PostContext): string {
  const base = `${ctx.make} ${ctx.model}`.trim();
  return ctx.year ? `${base} ${ctx.year}` : base;
}

// Price line shown on the image / in captions, e.g. "€40/ditë".
export function priceLabel(ctx: PostContext, lang: PostLang): string {
  return lang === "sq" ? `${ctx.priceValue}/ditë` : `${ctx.priceValue}/day`;
}

// A couple of short car specs, if present: "Automatik · 5 vende · Naftë".
export function specLine(ctx: PostContext, lang: PostLang): string {
  const parts: string[] = [];
  if (ctx.transmission) parts.push(ctx.transmission);
  if (ctx.seats) parts.push(lang === "sq" ? `${ctx.seats} vende` : `${ctx.seats} seats`);
  if (ctx.fuel) parts.push(ctx.fuel);
  return parts.join(" · ");
}

function hashtags(ctx: PostContext, lang: PostLang): string {
  const tags = ["#rentacar", "#qira", "#vetura", "#makina"];
  if (ctx.city) tags.push("#" + ctx.city.replace(/\s+/g, ""));
  tags.push(lang === "sq" ? "#Kosova" : "#Kosovo");
  return tags.join(" ");
}

function contactLines(ctx: PostContext, lang: PostLang): string {
  const lines: string[] = [];
  if (ctx.phone) lines.push((lang === "sq" ? "📞 Rezervo: " : "📞 Book: ") + ctx.phone);
  if (ctx.bookingUrl) lines.push("🔗 " + ctx.bookingUrl);
  return lines.join("\n");
}

// Three caption variants per occasion, in the chosen language.
export function buildCaptions(ctx: PostContext, occasion: PostOccasion, lang: PostLang): string[] {
  const title = carTitle(ctx);
  const price = priceLabel(ctx, lang);
  const specs = specLine(ctx, lang);
  const specSuffix = specs ? `\n${specs}` : "";
  const contact = contactLines(ctx, lang);
  const contactBlock = contact ? `\n\n${contact}` : "";
  const tags = hashtags(ctx, lang);

  let heads: string[];
  if (lang === "sq") {
    const byOccasion: Record<PostOccasion, string[]> = {
      available: [
        `✅ I lirë tani: ${title} — vetëm ${price}.`,
        `${title} është gati për ty. ${price}, rezervo datat para se të zihet.`,
        `Kërkon makinë për këto ditë? ${title} — ${price}.`,
      ],
      offer: [
        `🔥 OFERTË: ${title} për vetëm ${price}!`,
        `Çmim i veçantë këtë javë — ${title}, ${price}. Mos e lësho.`,
        `${title} me ofertë: ${price}. Vendet janë të kufizuara.`,
      ],
      weekend: [
        `🚗 Plane për fundjavë? ${title} — ${price}.`,
        `Bëje fundjavën tënde me ${title}. ${price}, rezervo tani.`,
        `Fundjavë pa stres me ${title} — ${price}.`,
      ],
      new: [
        `🆕 I ri në flotën tonë: ${title} — ${price}.`,
        `Sapo erdhi: ${title}. Provoje i pari — ${price}.`,
        `Risia jonë: ${title}, tani i disponueshëm për ${price}.`,
      ],
      showcase: [
        `${title} — gati për rrugët e tua. ${price}.`,
        `Zgjedh elegancën: ${title}, ${price}.`,
        `${title} të pret. ${price}.`,
      ],
    };
    heads = byOccasion[occasion];
  } else {
    const byOccasion: Record<PostOccasion, string[]> = {
      available: [
        `✅ Available now: ${title} — only ${price}.`,
        `${title} is ready for you. ${price}, book your dates before it's gone.`,
        `Need a car these days? ${title} — ${price}.`,
      ],
      offer: [
        `🔥 OFFER: ${title} for just ${price}!`,
        `Special price this week — ${title}, ${price}. Don't miss it.`,
        `${title} on offer: ${price}. Limited availability.`,
      ],
      weekend: [
        `🚗 Weekend plans? ${title} — ${price}.`,
        `Make your weekend with ${title}. ${price}, book now.`,
        `Stress-free weekend with ${title} — ${price}.`,
      ],
      new: [
        `🆕 New in our fleet: ${title} — ${price}.`,
        `Just arrived: ${title}. Be the first — ${price}.`,
        `Our newest ride: ${title}, now available at ${price}.`,
      ],
      showcase: [
        `${title} — ready for your roads. ${price}.`,
        `Choose style: ${title}, ${price}.`,
        `${title} is waiting for you. ${price}.`,
      ],
    };
    heads = byOccasion[occasion];
  }

  return heads.map((h) => `${ctx.businessName}\n${h}${specSuffix}${contactBlock}\n\n${tags}`);
}

// Post layouts the owner can pick between. Each is a distinct designed look.
export type PostTemplate = "classic" | "minimal" | "sidebar" | "ribbon" | "framed";
export const TEMPLATES: { id: PostTemplate; labelEn: string }[] = [
  { id: "classic", labelEn: "Classic" },
  { id: "minimal", labelEn: "Minimal" },
  { id: "sidebar", labelEn: "Side panel" },
  { id: "ribbon", labelEn: "Ribbon" },
  { id: "framed", labelEn: "Framed" },
];

// Brand accent swatches offered in the picker (first is the app's cherry).
export const ACCENT_PRESETS = [
  "#B12A32", "#0F172A", "#1E9E6A", "#1D4ED8",
  "#C2410C", "#7C3AED", "#DB2777", "#FED600",
];
