"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, Copy, Check, ImageOff, Sparkles, Upload, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import {
  OCCASIONS,
  TEMPLATES,
  ACCENT_PRESETS,
  occasionById,
  badgeText,
  carTitle,
  priceLabel,
  specLine,
  buildCaptions,
  type PostOccasion,
  type PostLang,
  type PostTemplate,
  type PostContext,
} from "@/lib/studio/templates";

type Car = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  priceValue: string;
  photos: string[];
  transmission: string | null;
  seats: number | null;
  fuel: string | null;
};

type Business = { name: string; phone: string | null; bookingUrl: string | null };

const FORMATS = {
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
} as const;
type FormatKey = keyof typeof FORMATS;

type Toggles = { price: boolean; specs: boolean; phone: boolean; booking: boolean; logo: boolean };

const LOGO_KEY = "menaxho_studio_logo";

// ---------- pure canvas helpers ----------

function hexLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function textOn(hex: string): string {
  return hexLuminance(hex) > 0.6 ? "#0F172A" : "#ffffff";
}
// Accent used as text on a dark post: keep it readable (dark accents → light, light → deeper).
function labelColor(hex: string): string {
  const l = hexLuminance(hex);
  if (l < 0.22) return "#CBD5E1";
  if (l > 0.75) return "#FDE047";
  return hex;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawCoverRegion(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, W: number, H: number) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(W / iw, H / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.save();
  roundRect(ctx, x, y, W, H, 0);
  ctx.clip();
  ctx.drawImage(img, x + (W - dw) / 2, y + (H - dh) / 2, dw, dh);
  ctx.restore();
}

function setShadow(ctx: CanvasRenderingContext2D, on: boolean, blur = 24) {
  if (on) {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.round(blur / 6);
  } else {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
}

function fitLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) lines.length = maxLines;
  return lines;
}

function drawLogo(ctx: CanvasRenderingContext2D, logo: HTMLImageElement, x: number, y: number, maxH: number, anchor: "tl" | "tr") {
  const iw = logo.naturalWidth || logo.width;
  const ih = logo.naturalHeight || logo.height;
  if (!iw || !ih) return;
  const scale = maxH / ih;
  const w = iw * scale;
  const dx = anchor === "tr" ? x - w : x;
  setShadow(ctx, true, 18);
  ctx.drawImage(logo, dx, y, w, maxH);
  setShadow(ctx, false);
}

// ---------- render ----------

interface Fields {
  businessName: string;
  title: string;
  price: string;
  specs: string;
  cta: string;
  badge: string;
}

interface RenderOpts {
  car: Car;
  business: Business;
  occasion: PostOccasion;
  lang: PostLang;
  accent: string;
  format: FormatKey;
  template: PostTemplate;
  img: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  toggles: Toggles;
  darken: number;
  fam: string;
}

function buildFields(o: RenderOpts): Fields {
  const c: PostContext = {
    businessName: o.business.name,
    make: o.car.make,
    model: o.car.model,
    year: o.car.year,
    priceValue: o.car.priceValue,
    phone: o.business.phone,
    bookingUrl: o.business.bookingUrl,
    transmission: o.car.transmission,
    seats: o.car.seats,
    fuel: o.car.fuel,
  };
  let cta = "";
  if (o.toggles.phone && o.business.phone) cta = (o.lang === "sq" ? "Rezervo: " : "Book: ") + o.business.phone;
  else if (o.toggles.booking && o.business.bookingUrl) cta = o.business.bookingUrl.replace(/^https?:\/\//, "");
  return {
    businessName: o.business.name,
    title: carTitle(c),
    price: priceLabel(c, o.lang),
    specs: o.toggles.specs ? specLine(c, o.lang) : "",
    cta,
    badge: badgeText(o.occasion, o.lang),
  };
}

function renderCanvas(canvas: HTMLCanvasElement, o: RenderOpts) {
  const { w: W, h: H } = FORMATS[o.format];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const fam = o.fam;
  const F = (w: number | string, s: number) => `${w} ${Math.round(s)}px '${fam}', system-ui, sans-serif`;
  const fields = buildFields(o);
  const onAccent = textOn(o.accent);
  const pad = Math.round(W * 0.062);

  // base photo / fallback
  if (o.img) {
    drawCoverRegion(ctx, o.img, 0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#334155");
    g.addColorStop(1, "#0f172a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (o.darken > 0) {
    ctx.fillStyle = `rgba(0,0,0,${o.darken})`;
    ctx.fillRect(0, 0, W, H);
  }

  const A = { ctx, W, H, F, fields, accent: o.accent, onAccent, pad, logo: o.toggles.logo ? o.logo : null, fam };
  switch (o.template) {
    case "minimal": tplMinimal(A); break;
    case "sidebar": tplSidebar(A); break;
    case "ribbon": tplRibbon(A); break;
    case "framed": tplFramed(A); break;
    default: tplClassic(A); break;
  }
}

type A = {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  F: (w: number | string, s: number) => string;
  fields: Fields;
  accent: string;
  onAccent: string;
  pad: number;
  logo: HTMLImageElement | null;
  fam: string;
};

function pricePill(a: A, x: number, y: number, align: "left" | "right") {
  const { ctx, W, F, fields, accent, onAccent } = a;
  if (!fields.price) return y;
  ctx.font = F(800, W * 0.044);
  const pw = ctx.measureText(fields.price).width;
  const h = Math.round(W * 0.086);
  const px = Math.round(W * 0.032);
  const bx = align === "right" ? x - (pw + px * 2) : x;
  setShadow(ctx, true, 20);
  roundRect(ctx, bx, y, pw + px * 2, h, Math.round(W * 0.02));
  ctx.fillStyle = accent;
  ctx.fill();
  setShadow(ctx, false);
  ctx.fillStyle = onAccent;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(fields.price, bx + px, y + h / 2 + 2);
  ctx.textBaseline = "alphabetic";
  return y;
}

function badgePill(a: A, x: number, y: number, align: "left" | "right") {
  const { ctx, W, F, fields, accent, onAccent } = a;
  if (!fields.badge) return;
  ctx.font = F(800, W * 0.03);
  const tw = ctx.measureText(fields.badge).width;
  const h = Math.round(W * 0.064);
  const px = Math.round(W * 0.03);
  const bx = align === "right" ? x - (tw + px * 2) : x;
  setShadow(ctx, true, 16);
  roundRect(ctx, bx, y, tw + px * 2, h, h / 2);
  ctx.fillStyle = accent;
  ctx.fill();
  setShadow(ctx, false);
  ctx.fillStyle = onAccent;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(fields.badge, bx + px, y + h / 2 + 2);
  ctx.textBaseline = "alphabetic";
}

function bottomStack(a: A, maxTitleW: number) {
  // Draws business name / title / specs / price+cta anchored to the bottom.
  const { ctx, W, H, F, fields, accent, pad } = a;
  ctx.textAlign = "left";
  let y = Math.round(H - pad);

  if (fields.cta) {
    ctx.font = F(600, W * 0.03);
    setShadow(ctx, true, 14);
    ctx.fillStyle = "#f1f5f9";
    ctx.fillText(fields.cta, pad, y);
    setShadow(ctx, false);
    y -= Math.round(W * 0.058);
  }
  if (fields.price) {
    const h = Math.round(W * 0.086);
    y -= h;
    pricePill(a, pad, y, "left");
    y -= Math.round(W * 0.03);
  }
  if (fields.specs) {
    ctx.font = F(500, W * 0.03);
    setShadow(ctx, true, 12);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(fields.specs, pad, y);
    setShadow(ctx, false);
    y -= Math.round(W * 0.05);
  }
  // title
  let size = W * 0.075;
  ctx.font = F(800, size);
  let lines = fitLines(ctx, fields.title, maxTitleW, 2);
  if (lines.length > 1) {
    size = W * 0.06;
    ctx.font = F(800, size);
    lines = fitLines(ctx, fields.title, maxTitleW, 2);
  }
  ctx.fillStyle = "#ffffff";
  setShadow(ctx, true, 22);
  const lineH = Math.round(size * 1.06);
  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.fillText(lines[i], pad, y);
    y -= lineH;
  }
  setShadow(ctx, false);
  y -= Math.round(W * 0.004);
  if (fields.businessName) {
    ctx.font = F(700, W * 0.03);
    setShadow(ctx, true, 10);
    ctx.fillStyle = labelColor(accent);
    ctx.fillText(fields.businessName.toUpperCase(), pad, y);
    setShadow(ctx, false);
  }
}

function tplClassic(a: A) {
  const { ctx, W, H, pad, logo } = a;
  const g = ctx.createLinearGradient(0, H * 0.35, 0, H);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.75, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0.9)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (logo) drawLogo(ctx, logo, pad, pad, Math.round(W * 0.1), "tl");
  badgePill(a, W - pad, pad + (logo ? 0 : 0), "right");
  bottomStack(a, W - pad * 2);
}

function tplMinimal(a: A) {
  const { ctx, W, H, F, fields, pad, logo, accent } = a;
  const g = ctx.createLinearGradient(0, H * 0.6, 0, H);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (logo) drawLogo(ctx, logo, pad, pad, Math.round(W * 0.09), "tl");
  // thin bottom row: business + title left, price right
  const y = Math.round(H - pad);
  ctx.textAlign = "left";
  ctx.font = F(800, W * 0.05);
  ctx.fillStyle = "#ffffff";
  setShadow(ctx, true, 18);
  const lines = fitLines(ctx, fields.title, W * 0.6, 1);
  ctx.fillText(lines[0] ?? fields.title, pad, y);
  setShadow(ctx, false);
  if (fields.businessName) {
    ctx.font = F(600, W * 0.028);
    ctx.fillStyle = labelColor(accent);
    setShadow(ctx, true, 8);
    ctx.fillText(fields.businessName.toUpperCase(), pad, y - Math.round(W * 0.06));
    setShadow(ctx, false);
  }
  pricePill(a, W - pad, y - Math.round(W * 0.07), "right");
}

function tplSidebar(a: A) {
  const { ctx, W, H, F, fields, accent, onAccent, pad, logo } = a;
  const portrait = H > W;
  // panel geometry
  const panelW = portrait ? W : Math.round(W * 0.4);
  const panelH = portrait ? Math.round(H * 0.42) : H;
  const px = 0;
  const py = portrait ? H - panelH : 0;
  // solid accent panel
  ctx.save();
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = accent;
  ctx.fillRect(px, py, panelW, panelH);
  ctx.restore();
  const ipad = Math.round(W * 0.055);
  let y = py + ipad + Math.round(W * 0.02);
  ctx.textAlign = "left";
  if (logo) {
    drawLogo(ctx, logo, px + ipad, y, Math.round(W * 0.1), "tl");
    y += Math.round(W * 0.13);
  }
  if (fields.badge) {
    ctx.font = F(800, W * 0.028);
    ctx.fillStyle = onAccent;
    ctx.globalAlpha = 0.85;
    ctx.fillText(fields.badge, px + ipad, y);
    ctx.globalAlpha = 1;
    y += Math.round(W * 0.055);
  }
  ctx.fillStyle = onAccent;
  let size = W * 0.07;
  ctx.font = F(800, size);
  let lines = fitLines(ctx, fields.title, panelW - ipad * 2, 3);
  if (lines.length > 2) { size = W * 0.055; ctx.font = F(800, size); lines = fitLines(ctx, fields.title, panelW - ipad * 2, 3); }
  const lineH = Math.round(size * 1.08);
  for (const ln of lines) { ctx.fillText(ln, px + ipad, y + size * 0.8); y += lineH; }
  y += Math.round(W * 0.01);
  if (fields.specs) {
    ctx.font = F(500, W * 0.028);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = onAccent;
    ctx.fillText(fields.specs, px + ipad, y + size * 0.3);
    ctx.globalAlpha = 1;
    y += Math.round(W * 0.055);
  }
  // price as inverted chip (white bg)
  if (fields.price) {
    ctx.font = F(800, W * 0.044);
    const pw = ctx.measureText(fields.price).width;
    const h = Math.round(W * 0.085);
    const cpx = Math.round(W * 0.03);
    roundRect(ctx, px + ipad, y + Math.round(W * 0.01), pw + cpx * 2, h, Math.round(W * 0.018));
    ctx.fillStyle = onAccent === "#ffffff" ? "#ffffff" : "#0F172A";
    ctx.fill();
    ctx.fillStyle = onAccent === "#ffffff" ? accent : "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(fields.price, px + ipad + cpx, y + Math.round(W * 0.01) + h / 2 + 2);
    ctx.textBaseline = "alphabetic";
    y += h + Math.round(W * 0.03);
  }
  if (fields.cta) {
    ctx.font = F(600, W * 0.028);
    ctx.fillStyle = onAccent;
    ctx.globalAlpha = 0.9;
    ctx.fillText(fields.cta, px + ipad, y + size * 0.2);
    ctx.globalAlpha = 1;
  }
  if (fields.businessName && !logo) {
    ctx.font = F(800, W * 0.03);
    ctx.fillStyle = onAccent;
    ctx.fillText(fields.businessName.toUpperCase(), px + ipad, py + panelH - ipad);
  }
}

function tplRibbon(a: A) {
  const { ctx, W, H, F, fields, accent, onAccent, pad, logo } = a;
  // corner ribbon (top-left diagonal)
  if (fields.badge) {
    ctx.save();
    ctx.translate(0, 0);
    ctx.rotate(-Math.PI / 4);
    const bandH = Math.round(W * 0.075);
    ctx.fillStyle = accent;
    ctx.fillRect(-W * 0.5, W * 0.1, W, bandH);
    ctx.fillStyle = onAccent;
    ctx.font = F(800, W * 0.03);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(fields.badge, 0, W * 0.1 + bandH / 2 + 2);
    ctx.restore();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  if (logo) drawLogo(ctx, logo, W - pad, pad, Math.round(W * 0.09), "tr");
  // bottom accent strip
  const stripH = Math.round(H * 0.2);
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "rgba(10,12,20,0.78)";
  ctx.fillRect(0, H - stripH, W, stripH);
  ctx.fillStyle = accent;
  ctx.fillRect(0, H - stripH, Math.round(W * 0.018), stripH);
  ctx.restore();
  const cy = H - stripH;
  let y = cy + Math.round(W * 0.06);
  ctx.textAlign = "left";
  if (fields.businessName) {
    ctx.font = F(700, W * 0.028);
    ctx.fillStyle = labelColor(accent);
    ctx.fillText(fields.businessName.toUpperCase(), pad, y);
    y += Math.round(W * 0.055);
  }
  ctx.font = F(800, W * 0.052);
  ctx.fillStyle = "#ffffff";
  const lines = fitLines(ctx, fields.title, W * 0.55, 1);
  ctx.fillText(lines[0] ?? fields.title, pad, y + Math.round(W * 0.01));
  if (fields.specs) {
    ctx.font = F(500, W * 0.027);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(fields.specs, pad, y + Math.round(W * 0.05));
  }
  pricePill(a, W - pad, cy + (stripH - Math.round(W * 0.086)) / 2, "right");
}

function tplFramed(a: A) {
  const { ctx, W, H, F, fields, accent, onAccent, pad, logo } = a;
  const m = Math.round(W * 0.045);
  // inset frame
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = Math.max(3, Math.round(W * 0.006));
  ctx.strokeRect(m, m, W - m * 2, H - m * 2);
  // accent corner ticks
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.round(W * 0.012);
  const t = Math.round(W * 0.05);
  ctx.beginPath();
  ctx.moveTo(m, m + t); ctx.lineTo(m, m); ctx.lineTo(m + t, m);
  ctx.moveTo(W - m - t, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - t);
  ctx.stroke();
  if (logo) drawLogo(ctx, logo, m + Math.round(W * 0.03), m + Math.round(W * 0.03), Math.round(W * 0.09), "tl");
  if (fields.badge) badgePill(a, W - m - Math.round(W * 0.03), m + Math.round(W * 0.03), "right");
  // title plate near bottom
  const plateH = Math.round(H * 0.24);
  const plX = m + Math.round(W * 0.03);
  const plY = H - m - Math.round(W * 0.03) - plateH;
  const plW = W - m * 2 - Math.round(W * 0.06);
  setShadow(ctx, true, 30);
  roundRect(ctx, plX, plY, plW, plateH, Math.round(W * 0.02));
  ctx.fillStyle = "rgba(10,12,20,0.82)";
  ctx.fill();
  setShadow(ctx, false);
  const ip = Math.round(W * 0.04);
  let y = plY + ip + Math.round(W * 0.03);
  ctx.textAlign = "left";
  if (fields.businessName) {
    ctx.font = F(700, W * 0.026);
    ctx.fillStyle = labelColor(accent);
    ctx.fillText(fields.businessName.toUpperCase(), plX + ip, y);
    y += Math.round(W * 0.05);
  }
  ctx.font = F(800, W * 0.055);
  ctx.fillStyle = "#ffffff";
  const lines = fitLines(ctx, fields.title, plW - ip * 2 - W * 0.22, 2);
  const lh = Math.round(W * 0.058);
  for (const ln of lines) { ctx.fillText(ln, plX + ip, y + Math.round(W * 0.01)); y += lh; }
  if (fields.specs) {
    ctx.font = F(500, W * 0.026);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(fields.specs, plX + ip, y);
  }
  pricePill(a, plX + plW - ip, plY + ip, "right");
  if (fields.cta) {
    ctx.font = F(600, W * 0.026);
    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "right";
    ctx.fillText(fields.cta, plX + plW - ip, plY + plateH - ip);
    ctx.textAlign = "left";
  }
}

// ---------- component ----------

export function PostStudio({ business, cars }: { business: Business; cars: Car[] }) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [carId, setCarId] = useState<string>(cars[0]?.id ?? "");
  const [occasion, setOccasion] = useState<PostOccasion>("offer");
  const [format, setFormat] = useState<FormatKey>("square");
  const [template, setTemplate] = useState<PostTemplate>("classic");
  const [lang, setLang] = useState<PostLang>("sq");
  const [accent, setAccent] = useState<string>(occasionById("offer").accent);
  const [darken, setDarken] = useState(0.28);
  const [toggles, setToggles] = useState<Toggles>({ price: true, specs: true, phone: true, booking: false, logo: true });

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgState, setImgState] = useState<"none" | "loading" | "ready" | "error">("none");
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [fontsReady, setFontsReady] = useState(false);

  const [captionIdx, setCaptionIdx] = useState(0);
  const [caption, setCaption] = useState("");
  const [copied, setCopied] = useState(false);
  const [exportErr, setExportErr] = useState(false);

  const car = useMemo(() => cars.find((c) => c.id === carId) ?? cars[0], [cars, carId]);
  const photo = car?.photos?.[0] ?? null;
  const fam = fontsReady ? "Poppins" : "system-ui";

  const captions = useMemo(() => {
    if (!car) return [];
    const ctx: PostContext = {
      businessName: business.name, make: car.make, model: car.model, year: car.year,
      priceValue: car.priceValue, phone: business.phone, bookingUrl: business.bookingUrl,
      transmission: car.transmission, seats: car.seats, fuel: car.fuel,
    };
    return buildCaptions(ctx, occasion, lang);
  }, [car, business, occasion, lang]);

  // Load the design font once.
  useEffect(() => {
    const id = "studio-fonts";
    if (typeof document === "undefined") return;
    if (!document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id;
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&display=swap";
      document.head.appendChild(l);
    }
    let alive = true;
    const anyFonts = (document as any).fonts;
    if (!anyFonts?.load) { setFontsReady(false); return; }
    Promise.all([
      anyFonts.load("800 72px Poppins"),
      anyFonts.load("700 40px Poppins"),
      anyFonts.load("600 30px Poppins"),
      anyFonts.load("500 28px Poppins"),
    ]).then(() => anyFonts.ready).then(() => { if (alive) setFontsReady(true); }).catch(() => { if (alive) setFontsReady(false); });
    return () => { alive = false; };
  }, []);

  // Restore a saved logo from this browser.
  useEffect(() => {
    try {
      const data = localStorage.getItem(LOGO_KEY);
      if (data) {
        const im = new Image();
        im.onload = () => setLogo(im);
        im.src = data;
      }
    } catch {}
  }, []);

  useEffect(() => { setAccent(occasionById(occasion).accent); }, [occasion]);
  useEffect(() => { setCaption(captions[captionIdx] ?? ""); }, [captions, captionIdx]);

  // Load the car photo (CORS so the canvas stays exportable).
  useEffect(() => {
    if (!photo) { setImg(null); setImgState("none"); return; }
    let alive = true;
    setImgState("loading");
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => { if (alive) { setImg(image); setImgState("ready"); } };
    image.onerror = () => { if (alive) { setImg(null); setImgState("error"); } };
    image.src = photo;
    return () => { alive = false; };
  }, [photo]);

  // Redraw.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !car) return;
    renderCanvas(canvas, { car, business, occasion, lang, accent, format, template, img, logo, toggles, darken, fam });
  }, [car, business, occasion, lang, accent, format, template, img, logo, toggles, darken, fam, imgState]);

  function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      const im = new Image();
      im.onload = () => {
        setLogo(im);
        try { localStorage.setItem(LOGO_KEY, data); } catch {}
      };
      im.src = data;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }
  function removeLogo() {
    setLogo(null);
    try { localStorage.removeItem(LOGO_KEY); } catch {}
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas || !car) return;
    setExportErr(false);
    try {
      canvas.toBlob((blob) => {
        if (!blob) { setExportErr(true); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const safe = `${car.make}-${car.model}-${occasion}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        a.href = url; a.download = `${safe}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, "image/png");
    } catch { setExportErr(true); }
  }

  async function copyCaption() {
    try { await navigator.clipboard.writeText(caption); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  function toggle(k: keyof Toggles) { setToggles((t) => ({ ...t, [k]: !t[k] })); }

  if (cars.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {t("Add a car with photos first, then come back to create posts.")}
      </div>
    );
  }

  const aspect = format === "square" ? "1 / 1" : "9 / 16";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,370px)_1fr]">
      {/* Controls */}
      <div className="space-y-5">
        <Field label={t("Car")}>
          <select value={carId} onChange={(e) => setCarId(e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.make} {c.model}{c.year ? ` ${c.year}` : ""}{c.photos.length ? "" : ` — ${t("no photo")}`}
              </option>
            ))}
          </select>
          {imgState === "error" && (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-600"><ImageOff className="h-3.5 w-3.5" /> {t("Couldn't load this photo — the post will use a dark background.")}</p>
          )}
          {imgState === "none" && (
            <p className="mt-1 text-[11px] text-muted-foreground">{t("This car has no photo — add one under Cars for a better post.")}</p>
          )}
        </Field>

        <Field label={t("Layout")}>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((tp) => (
              <button key={tp.id} type="button" onClick={() => setTemplate(tp.id)}
                className={"rounded-md border px-3 py-1.5 text-xs font-medium transition-colors " + (template === tp.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
                {t(tp.labelEn)}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("Occasion")}>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <button key={o.id} type="button" onClick={() => setOccasion(o.id)}
                className={"rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " + (occasion === o.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
                {t(o.labelEn)}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("Format")}>
            <div className="flex gap-2">
              {(Object.keys(FORMATS) as FormatKey[]).map((k) => (
                <button key={k} type="button" onClick={() => setFormat(k)}
                  className={"flex-1 rounded-md border px-2 py-1.5 text-xs font-medium " + (format === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
                  {k === "square" ? t("Post") : t("Story")}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t("Language")}>
            <div className="flex gap-2">
              {(["sq", "en"] as PostLang[]).map((l) => (
                <button key={l} type="button" onClick={() => setLang(l)}
                  className={"flex-1 rounded-md border px-2 py-1.5 text-xs font-medium uppercase " + (lang === l ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <Field label={t("Accent colour")}>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_PRESETS.map((c) => (
              <button key={c} type="button" onClick={() => setAccent(c)} title={c}
                className={"h-7 w-7 rounded-full border-2 " + (accent.toLowerCase() === c.toLowerCase() ? "border-foreground" : "border-transparent")}
                style={{ backgroundColor: c }} />
            ))}
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-border bg-background" />
          </div>
        </Field>

        <Field label={t("Logo")}>
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
              <Upload className="h-3.5 w-3.5" /> {logo ? t("Replace logo") : t("Upload logo")}
              <input type="file" accept="image/*" onChange={onLogoFile} className="hidden" />
            </label>
            {logo && (
              <button type="button" onClick={removeLogo} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-rose-600 hover:bg-muted">
                <Trash2 className="h-3.5 w-3.5" /> {t("Remove")}
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{t("Saved in this browser. Transparent PNG works best.")}</p>
        </Field>

        <Field label={t("Show on post")}>
          <div className="flex flex-wrap gap-3">
            {([["price", "Price"], ["specs", "Specs"], ["phone", "Phone"], ["booking", "Booking link"], ["logo", "Logo"]] as [keyof Toggles, string][]).map(([k, lbl]) => (
              <label key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={toggles[k]} onChange={() => toggle(k)} className="h-3.5 w-3.5 rounded border-border" />
                {t(lbl)}
              </label>
            ))}
          </div>
        </Field>

        <Field label={`${t("Photo darkness")} · ${Math.round(darken * 100)}%`}>
          <input type="range" min={0} max={70} value={Math.round(darken * 100)} onChange={(e) => setDarken(Number(e.target.value) / 100)} className="w-full accent-primary" />
        </Field>

        <button type="button" onClick={download} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Download className="h-4 w-4" /> {t("Download image")}
        </button>
        {exportErr && <p className="text-[11px] text-rose-600">{t("Couldn't export the image. Try a different photo.")}</p>}
      </div>

      {/* Preview + caption */}
      <div className="space-y-5">
        <div className="flex justify-center rounded-xl border border-border bg-muted/40 p-4">
          <canvas ref={canvasRef} className="max-h-[70vh] w-auto rounded-lg shadow-md" style={{ aspectRatio: aspect, maxWidth: format === "square" ? 460 : 310 }} />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> {t("Caption")}</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {captions.map((_, i) => (
                  <button key={i} type="button" onClick={() => setCaptionIdx(i)}
                    className={"h-6 w-6 rounded text-xs font-semibold " + (captionIdx === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70")}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <button type="button" onClick={copyCaption} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t("Copied") : t("Copy")}
              </button>
            </div>
          </div>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={7} className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm leading-relaxed" />
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t("Download the image, then paste the caption on Instagram or Facebook.")}{" "}
            <Link href="/cars" className="text-primary hover:underline">{t("Manage car photos")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
