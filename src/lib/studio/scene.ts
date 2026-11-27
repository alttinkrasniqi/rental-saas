// 2.V.2 Post Studio — scene model (pure, no DOM/Next; principle H).
// A design = background photo + a stack of movable "elements" (layers).
// Elements carry modern styling (glass, gradient, tracking) so templates read
// as 2025 design, not flat boxes. The same model feeds the DOM editor and the
// canvas exporter, so what you edit is exactly what you export.

export type ElKind = "text" | "pill" | "badge" | "logo" | "panel" | "line";

export type BindField = "businessName" | "title" | "price" | "specs" | "cta" | "badge" | "custom";

export interface El {
  id: string;
  kind: ElKind;
  x: number;             // left, 0..1 of width
  y: number;             // top, 0..1 of height
  field?: BindField;
  text?: string;
  fontFrac?: number;     // font size as fraction of width
  weight?: number;
  color?: ColorToken;
  bg?: BgToken | null;
  align?: "left" | "center" | "right";
  w?: number;            // panel/line width, or logo height (fraction of width)
  h?: number;            // panel height (fraction of height)
  maxWFrac?: number;
  radiusFrac?: number;
  opacity?: number;
  uppercase?: boolean;
  shadow?: boolean;      // soft shadow (text legibility / panel depth)
  tracking?: number;     // letter-spacing as a fraction of font size
  grad?: boolean;        // fill with an accent gradient (pill/panel)
  glass?: boolean;       // frosted-glass panel (blurred photo + tint + hairline)
  locked?: boolean;
}

export type ColorToken = "white" | "light" | "muted" | "dark" | "brand" | "accent" | "onAccent" | string;
export type BgToken = "accent" | "dark" | "glass" | "frost" | "plate" | "white" | string;

export interface Scene { template: string; elements: El[]; }
export interface SceneData { businessName: string; title: string; price: string; specs: string; cta: string; badge: string; }

// ---- colour ----
function hexLum(hex: string): number {
  const h = hex.replace("#", ""); const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return (0.2126 * parseInt(n.slice(0, 2), 16) + 0.7152 * parseInt(n.slice(2, 4), 16) + 0.0722 * parseInt(n.slice(4, 6), 16)) / 255;
}
export function textOn(hex: string): string { return hexLum(hex) > 0.6 ? "#0F172A" : "#ffffff"; }
export function labelColor(hex: string): string { const l = hexLum(hex); if (l < 0.22) return "#CBD5E1"; if (l > 0.75) return "#FDE047"; return hex; }
export function shade(hex: string, amt: number): string {
  let h = hex.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  let r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const f = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round(r + (f - r) * p); g = Math.round(g + (f - g) * p); b = Math.round(b + (f - b) * p);
  return `rgb(${r},${g},${b})`;
}
export function resolveColor(tok: ColorToken | undefined, accent: string): string {
  switch (tok) {
    case undefined: case "white": return "#ffffff";
    case "light": return "#e5e7eb";
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
    case null: case undefined: return null;
    case "accent": return accent;
    case "dark": return "#0F172A";
    case "glass": return "rgba(12,14,22,0.42)";
    case "frost": return "rgba(255,255,255,0.14)";
    case "plate": return "rgba(10,12,20,0.78)";
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
export interface TemplateDef { id: string; labelEn: string; build: () => El[]; }
const E = (e: El): El => e;

export const TEMPLATES: TemplateDef[] = [
  {
    id: "editorial", labelEn: "Editorial", build: () => [
      E({ id: "badge", kind: "badge", field: "badge", x: 0.062, y: 0.062, fontFrac: 0.028, weight: 700, bg: "accent", grad: true, color: "onAccent", tracking: 0.08, shadow: true }),
      E({ id: "logo", kind: "logo", field: "custom", x: 0.84, y: 0.055, w: 0.1 }),
      E({ id: "kicker", kind: "text", field: "businessName", x: 0.062, y: 0.63, fontFrac: 0.026, weight: 700, color: "brand", uppercase: true, tracking: 0.22, shadow: true }),
      E({ id: "title", kind: "text", field: "title", x: 0.062, y: 0.668, fontFrac: 0.085, weight: 800, color: "white", maxWFrac: 0.9, shadow: true }),
      E({ id: "specs", kind: "text", field: "specs", x: 0.062, y: 0.84, fontFrac: 0.028, weight: 500, color: "light", shadow: true }),
      E({ id: "price", kind: "pill", field: "price", x: 0.062, y: 0.888, fontFrac: 0.05, weight: 800, grad: true, bg: "accent", color: "onAccent", radiusFrac: 0.03, shadow: true }),
    ],
  },
  {
    id: "glass", labelEn: "Glass", build: () => [
      E({ id: "card", kind: "panel", field: "custom", x: 0.05, y: 0.58, w: 0.9, h: 0.36, glass: true, bg: "glass", radiusFrac: 0.05, shadow: true }),
      E({ id: "logo", kind: "logo", field: "custom", x: 0.085, y: 0.075, w: 0.1 }),
      E({ id: "badge", kind: "badge", field: "badge", x: 0.1, y: 0.625, fontFrac: 0.026, weight: 700, bg: "accent", grad: true, color: "onAccent", tracking: 0.06 }),
      E({ id: "title", kind: "text", field: "title", x: 0.1, y: 0.685, fontFrac: 0.062, weight: 800, color: "white", maxWFrac: 0.8 }),
      E({ id: "specs", kind: "text", field: "specs", x: 0.1, y: 0.79, fontFrac: 0.027, weight: 500, color: "muted" }),
      E({ id: "price", kind: "pill", field: "price", x: 0.1, y: 0.845, fontFrac: 0.05, weight: 800, grad: true, bg: "accent", color: "onAccent", radiusFrac: 0.03 }),
      E({ id: "cta", kind: "text", field: "cta", x: 0.62, y: 0.862, fontFrac: 0.026, weight: 600, color: "light" }),
    ],
  },
  {
    id: "minimal", labelEn: "Minimal", build: () => [
      E({ id: "logo", kind: "logo", field: "custom", x: 0.062, y: 0.06, w: 0.09 }),
      E({ id: "kicker", kind: "text", field: "businessName", x: 0.062, y: 0.8, fontFrac: 0.025, weight: 700, color: "brand", uppercase: true, tracking: 0.22, shadow: true }),
      E({ id: "line", kind: "line", field: "custom", x: 0.062, y: 0.842, w: 0.1, bg: "accent", grad: true }),
      E({ id: "title", kind: "text", field: "title", x: 0.062, y: 0.862, fontFrac: 0.052, weight: 800, color: "white", maxWFrac: 0.62, shadow: true }),
      E({ id: "price", kind: "pill", field: "price", x: 0.72, y: 0.855, fontFrac: 0.046, weight: 800, bg: "white", color: "dark", radiusFrac: 0.03, shadow: true }),
    ],
  },
  {
    id: "spotlight", labelEn: "Spotlight", build: () => [
      E({ id: "badge", kind: "badge", field: "badge", x: 0.062, y: 0.062, fontFrac: 0.028, weight: 700, bg: "accent", grad: true, color: "onAccent", tracking: 0.08, shadow: true }),
      E({ id: "logo", kind: "logo", field: "custom", x: 0.84, y: 0.055, w: 0.1 }),
      E({ id: "kicker", kind: "text", field: "businessName", x: 0.062, y: 0.66, fontFrac: 0.026, weight: 700, color: "brand", uppercase: true, tracking: 0.22, shadow: true }),
      E({ id: "title", kind: "text", field: "title", x: 0.062, y: 0.7, fontFrac: 0.056, weight: 800, color: "white", maxWFrac: 0.86, shadow: true }),
      E({ id: "price", kind: "pill", field: "price", x: 0.062, y: 0.8, fontFrac: 0.095, weight: 800, grad: true, bg: "accent", color: "onAccent", radiusFrac: 0.035, shadow: true }),
    ],
  },
  {
    id: "gradient", labelEn: "Gradient", build: () => [
      E({ id: "logo", kind: "logo", field: "custom", x: 0.062, y: 0.06, w: 0.1 }),
      E({ id: "badge", kind: "badge", field: "badge", x: 0.062, y: 0.66, fontFrac: 0.026, weight: 700, bg: "frost", color: "onAccent", tracking: 0.06 }),
      E({ id: "title", kind: "text", field: "title", x: 0.062, y: 0.72, fontFrac: 0.07, weight: 800, color: "onAccent", maxWFrac: 0.86 }),
      E({ id: "specs", kind: "text", field: "specs", x: 0.062, y: 0.84, fontFrac: 0.028, weight: 500, color: "onAccent", opacity: 0.85 }),
      E({ id: "price", kind: "pill", field: "price", x: 0.70, y: 0.84, fontFrac: 0.05, weight: 800, bg: "white", color: "dark", radiusFrac: 0.03, shadow: true }),
    ],
  },
  {
    id: "side", labelEn: "Side panel", build: () => [
      E({ id: "panel", kind: "panel", field: "custom", x: 0.045, y: 0.045, w: 0.42, h: 0.91, grad: true, bg: "accent", radiusFrac: 0.04, shadow: true }),
      E({ id: "logo", kind: "logo", field: "custom", x: 0.09, y: 0.1, w: 0.1 }),
      E({ id: "badge", kind: "text", field: "badge", x: 0.09, y: 0.27, fontFrac: 0.026, weight: 700, color: "onAccent", uppercase: true, tracking: 0.12, opacity: 0.9 }),
      E({ id: "title", kind: "text", field: "title", x: 0.09, y: 0.31, fontFrac: 0.064, weight: 800, color: "onAccent", maxWFrac: 0.34 }),
      E({ id: "specs", kind: "text", field: "specs", x: 0.09, y: 0.58, fontFrac: 0.025, weight: 500, color: "onAccent", opacity: 0.85 }),
      E({ id: "price", kind: "pill", field: "price", x: 0.09, y: 0.64, fontFrac: 0.046, weight: 800, bg: "white", color: "dark", radiusFrac: 0.025, shadow: true }),
      E({ id: "cta", kind: "text", field: "cta", x: 0.09, y: 0.76, fontFrac: 0.024, weight: 600, color: "onAccent", opacity: 0.9 }),
    ],
  },
  {
    id: "tag", labelEn: "Tag", build: () => [
      E({ id: "strip", kind: "panel", field: "custom", x: 0.05, y: 0.73, w: 0.9, h: 0.2, glass: true, bg: "glass", radiusFrac: 0.045, shadow: true }),
      E({ id: "badge", kind: "badge", field: "badge", x: 0.062, y: 0.07, fontFrac: 0.03, weight: 700, bg: "accent", grad: true, color: "onAccent", tracking: 0.08, shadow: true }),
      E({ id: "logo", kind: "logo", field: "custom", x: 0.84, y: 0.07, w: 0.09 }),
      E({ id: "kicker", kind: "text", field: "businessName", x: 0.09, y: 0.768, fontFrac: 0.024, weight: 700, color: "brand", uppercase: true, tracking: 0.18 }),
      E({ id: "title", kind: "text", field: "title", x: 0.09, y: 0.802, fontFrac: 0.04, weight: 800, color: "white", maxWFrac: 0.6 }),
      E({ id: "specs", kind: "text", field: "specs", x: 0.09, y: 0.878, fontFrac: 0.023, weight: 500, color: "muted" }),
      E({ id: "price", kind: "pill", field: "price", x: 0.72, y: 0.788, fontFrac: 0.05, weight: 800, grad: true, bg: "accent", color: "onAccent", radiusFrac: 0.03 }),
    ],
  },
  {
    id: "frame", labelEn: "Frame", build: () => [
      E({ id: "plate", kind: "panel", field: "custom", x: 0.1, y: 0.66, w: 0.8, h: 0.24, glass: true, bg: "glass", radiusFrac: 0.035, shadow: true }),
      E({ id: "badge", kind: "badge", field: "badge", x: 0.72, y: 0.08, fontFrac: 0.028, weight: 700, bg: "accent", grad: true, color: "onAccent", tracking: 0.06 }),
      E({ id: "logo", kind: "logo", field: "custom", x: 0.11, y: 0.08, w: 0.09 }),
      E({ id: "price", kind: "pill", field: "price", x: 0.64, y: 0.69, fontFrac: 0.046, weight: 800, grad: true, bg: "accent", color: "onAccent", radiusFrac: 0.025 }),
      E({ id: "kicker", kind: "text", field: "businessName", x: 0.135, y: 0.705, fontFrac: 0.024, weight: 700, color: "brand", uppercase: true, tracking: 0.18 }),
      E({ id: "title", kind: "text", field: "title", x: 0.135, y: 0.76, fontFrac: 0.05, weight: 800, color: "white", maxWFrac: 0.74 }),
      E({ id: "specs", kind: "text", field: "specs", x: 0.135, y: 0.85, fontFrac: 0.024, weight: 500, color: "muted" }),
    ],
  },
];

export function templateById(id: string): TemplateDef { return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]; }
export function createScene(templateId: string): Scene {
  const tpl = templateById(templateId);
  return { template: tpl.id, elements: tpl.build().map((e) => ({ ...e })) };
}
