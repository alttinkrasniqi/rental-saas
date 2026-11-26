// Canvas renderer for a Scene — used for the exported PNG and for the
// template-gallery thumbnails. The DOM editor mirrors this layout so what the
// owner edits matches what they download.
import {
  type Scene, type El, type SceneData,
  resolveColor, resolveBg, resolveText,
} from "./scene";

export const DIMS = {
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
} as const;
export type FormatKey = keyof typeof DIMS;

// Extra per-template decoration not expressed as elements.
const SCRIM: Record<string, "bottom" | undefined> = {
  bold: "bottom", minimal: "bottom", spotlight: "bottom", topbar: "bottom",
};
const FRAME = new Set(["framed"]);

export interface DrawAssets {
  img: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  accent: string;
  data: SceneData;
  format: FormatKey;
  darken: number;
  fam: string;
  filter?: string;
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
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const s = Math.max(W / iw, H / ih), dw = iw * s, dh = ih * s;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}
function shadow(ctx: CanvasRenderingContext2D, on: boolean, blur = 20) {
  ctx.shadowColor = on ? "rgba(0,0,0,0.55)" : "transparent";
  ctx.shadowBlur = on ? blur : 0;
  ctx.shadowOffsetY = on ? Math.round(blur / 6) : 0;
}
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines = 3): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/);
    let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
    }
    out.push(cur);
  }
  if (out.length > maxLines) out.length = maxLines;
  return out;
}

export function elFontPx(el: El, W: number): number {
  return Math.round((el.fontFrac ?? 0.04) * W);
}

function drawEl(ctx: CanvasRenderingContext2D, el: El, o: DrawAssets, W: number, H: number) {
  const x = el.x * W, y = el.y * H;
  const fam = o.fam;
  const fpx = elFontPx(el, W);
  const col = resolveColor(el.color, o.accent);
  ctx.globalAlpha = el.opacity ?? 1;

  if (el.kind === "panel") {
    const w = (el.w ?? 1) * W, h = (el.h ?? 0.1) * H;
    const bg = resolveBg(el.bg, o.accent) ?? "rgba(0,0,0,0.5)";
    const r = (el.radiusFrac ?? 0) * W;
    if (r > 0) { roundRect(ctx, x, y, w, h, r); ctx.fillStyle = bg; ctx.fill(); }
    else { ctx.fillStyle = bg; ctx.fillRect(x, y, w, h); }
    ctx.globalAlpha = 1;
    return;
  }

  if (el.kind === "logo") {
    if (!o.logo) { ctx.globalAlpha = 1; return; }
    const iw = o.logo.naturalWidth || o.logo.width, ih = o.logo.naturalHeight || o.logo.height;
    if (iw && ih) {
      const hh = (el.w ?? 0.1) * W, ww = (iw / ih) * hh;
      shadow(ctx, true, 16);
      ctx.drawImage(o.logo, x, y, ww, hh);
      shadow(ctx, false);
    }
    ctx.globalAlpha = 1;
    return;
  }

  const text = resolveText(el, o.data);
  if (!text) { ctx.globalAlpha = 1; return; }
  const shown = el.uppercase ? text.toUpperCase() : text;
  ctx.font = `${el.weight ?? 700} ${fpx}px '${fam}', system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  if (el.kind === "pill" || el.kind === "badge") {
    const tw = ctx.measureText(shown).width;
    const padX = Math.max(fpx * 0.55, W * 0.026);
    const padY = Math.round(fpx * 0.36);
    const w = tw + padX * 2, h = fpx + padY * 2;
    const r = el.kind === "badge" ? h / 2 : (el.radiusFrac ?? 0.02) * W;
    const bg = resolveBg(el.bg ?? "accent", o.accent) ?? o.accent;
    shadow(ctx, true, 18);
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = bg;
    ctx.fill();
    shadow(ctx, false);
    ctx.fillStyle = col;
    ctx.textBaseline = "middle";
    ctx.fillText(shown, x + padX, y + h / 2 + 1);
    ctx.textBaseline = "top";
    ctx.globalAlpha = 1;
    return;
  }

  // plain text (optionally wrapped)
  const maxW = el.maxWFrac ? el.maxWFrac * W : W;
  const lines = el.maxWFrac ? wrap(ctx, shown, maxW, 3) : shown.split("\n");
  shadow(ctx, !!el.shadow, 18);
  ctx.fillStyle = col;
  const lh = Math.round(fpx * 1.08);
  lines.forEach((ln, i) => {
    const lx = el.align === "right" ? x - ctx.measureText(ln).width : el.align === "center" ? x - ctx.measureText(ln).width / 2 : x;
    ctx.fillText(ln, lx, y + i * lh);
  });
  shadow(ctx, false);
  ctx.globalAlpha = 1;
}

export function drawScene(canvas: HTMLCanvasElement, scene: Scene, o: DrawAssets) {
  const { w: W, h: H } = DIMS[o.format];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (o.img) { if (o.filter) ctx.filter = o.filter; cover(ctx, o.img, W, H); ctx.filter = "none"; }
  else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#334155"); g.addColorStop(1, "#0f172a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (o.darken > 0) { ctx.fillStyle = `rgba(0,0,0,${o.darken})`; ctx.fillRect(0, 0, W, H); }

  if (SCRIM[scene.template] === "bottom") {
    const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.7, "rgba(0,0,0,0.5)");
    g.addColorStop(1, "rgba(0,0,0,0.9)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (FRAME.has(scene.template)) {
    const m = Math.round(W * 0.045);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = Math.max(3, Math.round(W * 0.006));
    ctx.strokeRect(m, m, W - m * 2, H - m * 2);
    ctx.strokeStyle = o.accent;
    ctx.lineWidth = Math.round(W * 0.012);
    const t = Math.round(W * 0.05);
    ctx.beginPath();
    ctx.moveTo(m, m + t); ctx.lineTo(m, m); ctx.lineTo(m + t, m);
    ctx.moveTo(W - m - t, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - t);
    ctx.stroke();
  }

  for (const el of scene.elements) drawEl(ctx, el, o, W, H);
}
