// 2.V.2 Post Studio — scene model (pure, no DOM/Next; principle H).
// A design is a background photo + a stack of movable "elements" (layers).
// Templates are presets that fill the scene; the owner can then drag, edit,
// restyle, add or remove any element. The same model feeds both the DOM
// editor and the canvas exporter, so what you edit is exactly what you export.

export type ElKind = "text" | "pill" | "badge" | "logo" | "panel";

// Data fields an element can bind to (kept fresh from the selected car).
export type BindField = "businessName" | "title" | "price" | "specs" | "cta" | "badge" | "custom";

export interface El {
  id: string;
  kind: ElKind;
  x: number;             // left, 0..1 of width
  y: number;             // top, 0..1 of height
  field?: BindField;     // text source; "custom" uses `text`
  text?: string;         // override / custom text (if set, wins over the bound value)
  fontFrac?: number;     // font size as a fraction of width (e.g. 0.07)
  weight?: number;       // 400..800
  color?: ColorToken;    // text colour
  bg?: BgToken | null;   // pill/badge/panel fill
  align?: "left" | "center" | "right";
  w?: number;            // width (panel) or logo height, as fraction of width
  h?: number;            // height (panel) as fraction of height
  maxWFrac?: number;     // wrap width for text, fraction of width
  radiusFrac?: number;   // corner radius as fraction of width
  opacity?: number;
  uppercase?: boolean;
  shadow?: boolean;      // text shadow for legibility on photos
  locked?: boolean;      // not draggable (e.g. full-bleed panel)
}

export type ColorToken = "white" | "light" | "muted" | "dark" | "brand" | "accent" | "onAccent" | string;
export type BgToken = "accent" | "dark" | "glass" | "plate" | "white" | string;

export interface Scene {
  template: string;
  elements: El[];
}

export interface SceneData {
  businessName: string;
  title: string;
  price: string;
  specs: string;
  cta: string;
  badge: string;
}

// ---- colour resolution ----

function hexLum(hex: string): number {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function textOn(hex: string): string {
  return hexLum(hex) > 0.6 ? "#0F172A" : "#ffffff";
}
export function labelColor(hex: string): string {
  const l = hexLum(hex);
  if (l < 0.22) return "#CBD5E1";
  if (l > 0.75) return "#FDE047";
  return hex;
}
export function resolveColor(tok: ColorToken | undefined, accent: string): string {
  switch (tok) {
    case undefined:
    case "white": return "#ffffff";
    case "light": return "#e2e8f0";
    case "muted": return "#cbd5e1";
    case "dark": return "#0F172A";
    case "brand": return labelColor(accent);
    case "accent": return accent;
    case "onAccent": return textOn(accent);
    default: return tok;
  }
}
export function resolveBg(tok: BgToken | null | undefined, accent: string): string | null {
  switch (tok) {
    case null:
    case undefined: return null;
    case "accent": return accent;
    case "dark": return "#0F172A";
    case "glass": return "rgba(10,12,20,0.78)";
    case "plate": return "rgba(10,12,20,0.84)";
    case "white": return "#ffffff";
    default: return tok;
  }
}

export function resolveText(el: El, data: SceneData): string {
  if (el.text != null && el.text !== "") return el.text;
  if (el.field && el.field !== "custom") return data[el.field] ?? "";
  return el.text ?? "";
}

// ---- templates ----

export interface TemplateDef {
  id: string;
  labelEn: string;
  build: () => El[];
}

const E = (e: El): El => e;

export const TEMPLATES: TemplateDef[] = [
  {
    id: "bold", labelEn: "Bold", build: () => [
      E({ id: "badge", kind: "badge", field: "badge", x: 0.62, y: 0.062, fontFrac: 0.03, weight: 800, bg: "accent", color: "onAccent" }),
      E({ id: "logo", kind: "logo", field: "custom", x: 0.062, y: 0.055, w: 0.11 }),
      E({ id: "brand", kind: "text", field: "businessName", x: 0.062, y: 0.655, fontFrac: 0.028, weight: 700, color: "brand", uppercase: true, shadow: true }),
      E({ id: "title", kind: "text", field: "title", x: 0.062, y: 0.70, fontFrac: 0.06, weight: 800, color: "white", maxWFrac: 0.84, shadow: true }),
      E({ id: "specs", kind: "text", field: "specs", x: 0.062, y: 0.785, fontFrac: 0.028, weight: 500, color: "light", shadow: true }),
      E({ id: "price", kind: "pill", field: "price", x: 0.062, y: 0.83, fontFrac: 0.044, weight: 800, bg: "accent", color: "onAccent", radiusFrac: 0.02 }),
      E({ id: "cta", kind: "text", field: "cta", x: 0.062, y: 0.925, fontFrac: 0.028, weight: 600, color: "light", shadow: true }),
    ],
  },
  {
    id: "minimal", labelEn: "Minimal", build: () => [
      E({ id: "logo", kind: "logo", field: "custom", x: 0.062, y: 0.055, w: 0.09 }),
      E({ id: "brand", kind: "text", field: "businessName", x: 0.062, y: 0.83, fontFrac: 0.026, weight: 600, color: "brand", uppercase: true, shadow: true }),
      E({ id: "title", kind: "text", field: "title", x: 0.062, y: 0.875, fontFrac: 0.05, weight: 800, color: "white", maxWFrac: 0.62, shadow: true }),
      E({ id: "price", kind: "pill", field: "price", x: 0.72, y: 0.865, fontFrac: 0.044, weight: 800, bg: "white", color: "dark", radiusFrac: 0.02 }),
    ],
  },
  {
    id: "panel", labelEn: "Side panel", build: () => [
      E({ id: "bgpanel", kind: "panel", field: "custom", x: 0, y: 0, w: 0.42, h: 1, bg: "accent", opacity: 0.94, locked: true }),
      E({ id: "logo", kind: "logo", field: "custom", x: 0.055, y: 0.07, w: 0.1 }),
      E({ id: "badge", kind: "text", field: "badge", x: 0.055, y: 0.22, fontFrac: 0.028, weight: 800, color: "onAccent" }),
      E({ id: "title", kind: "text", field: "title", x: 0.055, y: 0.27, fontFrac: 0.066, weight: 800, color: "onAccent", maxWFrac: 0.33 }),
      E({ id: "specs", kind: "text", field: "specs", x: 0.055, y: 0.54, fontFrac: 0.026, weight: 500, color: "onAccent" }),
      E({ id: "price", kind: "pill", field: "price", x: 0.055, y: 0.62, fontFrac: 0.044, weight: 800, bg: "white", color: "dark", radiusFrac: 0.018 }),
      E({ id: "cta", kind: "text", field: "cta", x: 0.055, y: 0.73, fontFrac: 0.026, weight: 600, color: "onAccent" }),
    ],
  },
  {
    id: "ribbon", labelEn: "Ribbon", build: () => [
      E({ id: "strip", kind: "panel", field: "custom", x: 0, y: 0.8, w: 1, h: 0.2, bg: "glass", locked: true }),
      E({ id: "accentbar", kind: "panel", field: "custom", x: 0, y: 0.8, w: 0.018, h: 0.2, bg: "accent", locked: true }),
      E({ id: "badge", kind: "badge", field: "badge", x: 0.70, y: 0.07, fontFrac: 0.03, weight: 800, bg: "accent", color: "onAccent" }),
      E({ id: "logo", kind: "logo", field: "custom", x: 0.82, y: 0.86, w: 0.09 }),
      E({ id: "brand", kind: "text", field: "businessName", x: 0.062, y: 0.83, fontFrac: 0.028, weight: 700, color: "brand", uppercase: true }),
      E({ id: "title", kind: "text", field: "title", x: 0.062, y: 0.87, fontFrac: 0.05, weight: 800, color: "white", maxWFrac: 0.58 }),
      E({ id: "price", kind: "pill", field: "price", x: 0.72, y: 0.863, fontFrac: 0.044, weight: 800, bg: "accent", color: "onAccent", radiusFrac: 0.02 }),
    ],
  },
  {
    id: "card", labelEn: "Glass card", build: () => [
      E({ id: "plate", kind: "panel", field: "custom", x: 0.06, y: 0.64, w: 0.88, h: 0.3, bg: "plate", radiusFrac: 0.03 }),
      E({ id: "badge", kind: "badge", field: "badge", x: 0.1, y: 0.68, fontFrac: 0.028, weight: 800, bg: "accent", color: "onAccent" }),
      E({ id: "price", kind: "pill", field: "price", x: 0.62, y: 0.675, fontFrac: 0.046, weight: 800, bg: "accent", color: "onAccent", radiusFrac: 0.02 }),
      E({ id: "title", kind: "text", field: "title", x: 0.1, y: 0.765, fontFrac: 0.055, weight: 800, color: "white", maxWFrac: 0.8 }),
      E({ id: "specs", kind: "text", field: "specs", x: 0.1, y: 0.87, fontFrac: 0.026, weight: 500, color: "muted" }),
    ],
  },
  {
    id: "topbar", labelEn: "Top bar", build: () => [
      E({ id: "bar", kind: "panel", field: "custom", x: 0, y: 0, w: 1, h: 0.13, bg: "accent", opacity: 0.96, locked: true }),
      E({ id: "brand", kind: "text", field: "businessName", x: 0.062, y: 0.045, fontFrac: 0.04, weight: 800, color: "onAccent", uppercase: true }),
      E({ id: "logo", kind: "logo", field: "custom", x: 0.85, y: 0.028, w: 0.075 }),
      E({ id: "title", kind: "text", field: "title", x: 0.062, y: 0.80, fontFrac: 0.06, weight: 800, color: "white", maxWFrac: 0.84, shadow: true }),
      E({ id: "specs", kind: "text", field: "specs", x: 0.062, y: 0.895, fontFrac: 0.028, weight: 500, color: "light", shadow: true }),
      E({ id: "price", kind: "pill", field: "price", x: 0.7, y: 0.86, fontFrac: 0.05, weight: 800, bg: "accent", color: "onAccent", radiusFrac: 0.02 }),
    ],
  },
  {
    id: "spotlight", labelEn: "Price spotlight", build: () => [
      E({ id: "badge", kind: "badge", field: "badge", x: 0.062, y: 0.062, fontFrac: 0.03, weight: 800, bg: "accent", color: "onAccent" }),
      E({ id: "logo", kind: "logo", field: "custom", x: 0.84, y: 0.055, w: 0.1 }),
      E({ id: "brand", kind: "text", field: "businessName", x: 0.062, y: 0.70, fontFrac: 0.03, weight: 700, color: "brand", uppercase: true, shadow: true }),
      E({ id: "title", kind: "text", field: "title", x: 0.062, y: 0.745, fontFrac: 0.056, weight: 800, color: "white", maxWFrac: 0.84, shadow: true }),
      E({ id: "price", kind: "pill", field: "price", x: 0.062, y: 0.85, fontFrac: 0.08, weight: 800, bg: "accent", color: "onAccent", radiusFrac: 0.025 }),
    ],
  },
  {
    id: "framed", labelEn: "Framed", build: () => [
      E({ id: "plate", kind: "panel", field: "custom", x: 0.085, y: 0.67, w: 0.83, h: 0.26, bg: "plate", radiusFrac: 0.02 }),
      E({ id: "badge", kind: "badge", field: "badge", x: 0.7, y: 0.085, fontFrac: 0.03, weight: 800, bg: "accent", color: "onAccent" }),
      E({ id: "logo", kind: "logo", field: "custom", x: 0.1, y: 0.085, w: 0.09 }),
      E({ id: "price", kind: "pill", field: "price", x: 0.64, y: 0.70, fontFrac: 0.046, weight: 800, bg: "accent", color: "onAccent", radiusFrac: 0.018 }),
      E({ id: "brand", kind: "text", field: "businessName", x: 0.115, y: 0.715, fontFrac: 0.026, weight: 700, color: "brand", uppercase: true }),
      E({ id: "title", kind: "text", field: "title", x: 0.115, y: 0.775, fontFrac: 0.05, weight: 800, color: "white", maxWFrac: 0.76 }),
      E({ id: "specs", kind: "text", field: "specs", x: 0.115, y: 0.865, fontFrac: 0.026, weight: 500, color: "muted" }),
    ],
  },
];

export function templateById(id: string): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function createScene(templateId: string): Scene {
  const tpl = templateById(templateId);
  return { template: tpl.id, elements: tpl.build().map((e) => ({ ...e })) };
}
