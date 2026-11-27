// Canvas renderer for a Scene — exported PNG + gallery thumbnails. Mirrors the
// DOM editor. Modern primitives: frosted glass, accent gradients, tracking.
import { type Scene, type El, type SceneData, resolveColor, resolveBg, resolveText, shade, textOn } from "./scene";

export const DIMS = { square: { w: 1080, h: 1080 }, story: { w: 1080, h: 1920 } } as const;
export type FormatKey = keyof typeof DIMS;

const SCRIM: Record<string, boolean> = { editorial: true, minimal: true, spotlight: true };
const WASH = new Set(["gradient"]);
const FRAME = new Set(["frame"]);

export interface DrawAssets {
  img: HTMLImageElement | null; logo: HTMLImageElement | null; accent: string;
  data: SceneData; format: FormatKey; darken: number; fam: string; filter?: string;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
}
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height; if (!iw || !ih) return;
  const s = Math.max(W / iw, H / ih), dw = iw * s, dh = ih * s;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}
function shadowOn(ctx: CanvasRenderingContext2D, blur: number, dy: number) { ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = blur; ctx.shadowOffsetY = dy; }
function shadowOff(ctx: CanvasRenderingContext2D) { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
function gradFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, accent: string, vertical: boolean) {
  const g = vertical ? ctx.createLinearGradient(x, y, x, y + h) : ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, shade(accent, 0.14)); g.addColorStop(1, shade(accent, -0.26)); return g;
}
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines = 3): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/); let cur = "";
    for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
    out.push(cur);
  }
  if (out.length > maxLines) out.length = maxLines;
  return out;
}
export function elFontPx(el: El, W: number): number { return Math.round((el.fontFrac ?? 0.04) * W); }

function drawEl(ctx: CanvasRenderingContext2D, el: El, o: DrawAssets, W: number, H: number) {
  const x = el.x * W, y = el.y * H, fam = o.fam, fpx = elFontPx(el, W);
  ctx.globalAlpha = el.opacity ?? 1;

  if (el.kind === "line") {
    const lw = (el.w ?? 0.1) * W, lh = Math.max(3, W * 0.009);
    roundRect(ctx, x, y, lw, lh, lh / 2);
    ctx.fillStyle = el.grad ? (gradFill(ctx, x, y, lw, lh, o.accent, false) as any) : (resolveBg(el.bg, o.accent) ?? o.accent);
    ctx.fill(); ctx.globalAlpha = 1; return;
  }

  if (el.kind === "panel") {
    const w = (el.w ?? 1) * W, h = (el.h ?? 0.1) * H, r = (el.radiusFrac ?? 0) * W;
    if (el.glass) {
      ctx.save(); shadowOn(ctx, W * 0.03, W * 0.012); roundRect(ctx, x, y, w, h, r); ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fill(); ctx.restore();
      ctx.save(); roundRect(ctx, x, y, w, h, r); ctx.clip();
      if (o.img) { ctx.filter = `blur(${Math.round(W * 0.03)}px)`; cover(ctx, o.img, W, H); ctx.filter = "none"; } else { ctx.fillStyle = "#1e293b"; ctx.fillRect(x, y, w, h); }
      ctx.fillStyle = resolveBg(el.bg, o.accent) ?? "rgba(12,14,22,0.42)"; ctx.fillRect(x, y, w, h); ctx.restore();
      roundRect(ctx, x, y, w, h, r); ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = Math.max(1.5, W * 0.0018); ctx.stroke();
      ctx.globalAlpha = 1; return;
    }
    const fill = el.grad ? gradFill(ctx, x, y, w, h, o.accent, true) : (resolveBg(el.bg, o.accent) ?? "rgba(0,0,0,0.5)");
    if (el.shadow) { ctx.save(); shadowOn(ctx, W * 0.03, W * 0.012); roundRect(ctx, x, y, w, h, r); ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill(); ctx.restore(); }
    roundRect(ctx, x, y, w, h, r); ctx.fillStyle = fill as any; ctx.fill();
    ctx.globalAlpha = 1; return;
  }

  if (el.kind === "logo") {
    if (!o.logo) { ctx.globalAlpha = 1; return; }
    const iw = o.logo.naturalWidth || o.logo.width, ih = o.logo.naturalHeight || o.logo.height;
    if (iw && ih) { const hh = (el.w ?? 0.1) * W, ww = (iw / ih) * hh; ctx.save(); shadowOn(ctx, 16, 2); ctx.drawImage(o.logo, x, y, ww, hh); ctx.restore(); }
    ctx.globalAlpha = 1; return;
  }

  const text = resolveText(el, o.data); if (!text) { ctx.globalAlpha = 1; return; }
  const shown = el.uppercase ? text.toUpperCase() : text;
  ctx.font = `${el.weight ?? 700} ${fpx}px '${fam}', system-ui, sans-serif`;
  (ctx as any).letterSpacing = el.tracking ? `${Math.round(el.tracking * fpx)}px` : "0px";
  ctx.textAlign = "left"; ctx.textBaseline = "top";

  if (el.kind === "pill" || el.kind === "badge") {
    const tw = ctx.measureText(shown).width;
    const padX = Math.max(fpx * 0.6, W * 0.028), padY = Math.round(fpx * 0.4);
    const w = tw + padX * 2, h = fpx + padY * 2;
    const r = el.kind === "badge" ? h / 2 : (el.radiusFrac ?? 0.02) * W;
    const fill = el.grad ? gradFill(ctx, x, y, w, h, o.accent, false) : (resolveBg(el.bg ?? "accent", o.accent) ?? o.accent);
    if (el.shadow) { ctx.save(); shadowOn(ctx, W * 0.025, W * 0.008); roundRect(ctx, x, y, w, h, r); ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fill(); ctx.restore(); }
    roundRect(ctx, x, y, w, h, r); ctx.fillStyle = fill as any; ctx.fill();
    ctx.fillStyle = resolveColor(el.color, o.accent); ctx.textBaseline = "middle"; ctx.fillText(shown, x + padX, y + h / 2 + 1); ctx.textBaseline = "top";
    (ctx as any).letterSpacing = "0px"; ctx.globalAlpha = 1; return;
  }

  const maxW = el.maxWFrac ? el.maxWFrac * W : W;
  const lines = el.maxWFrac ? wrap(ctx, shown, maxW, 3) : shown.split("\n");
  if (el.shadow) shadowOn(ctx, 18, 2);
  ctx.fillStyle = resolveColor(el.color, o.accent);
  const lh = Math.round(fpx * 1.08);
  lines.forEach((ln, i) => {
    const lx = el.align === "right" ? x - ctx.measureText(ln).width : el.align === "center" ? x - ctx.measureText(ln).width / 2 : x;
    ctx.fillText(ln, lx, y + i * lh);
  });
  shadowOff(ctx); (ctx as any).letterSpacing = "0px"; ctx.globalAlpha = 1;
}

export function drawScene(canvas: HTMLCanvasElement, scene: Scene, o: DrawAssets) {
  const { w: W, h: H } = DIMS[o.format];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d"); if (!ctx) return;

  if (o.img) { if (o.filter) ctx.filter = o.filter; cover(ctx, o.img, W, H); ctx.filter = "none"; }
  else { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#334155"); g.addColorStop(1, "#0f172a"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (o.darken > 0) { ctx.fillStyle = `rgba(0,0,0,${o.darken})`; ctx.fillRect(0, 0, W, H); }

  if (SCRIM[scene.template]) {
    const g = ctx.createLinearGradient(0, H * 0.4, 0, H);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.65, "rgba(0,0,0,0.5)"); g.addColorStop(1, "rgba(0,0,0,0.92)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (WASH.has(scene.template)) {
    const a = o.accent, g = ctx.createLinearGradient(0, H * 0.45, 0, H);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.55, shade(a, -0.1)); g.addColorStop(1, shade(a, -0.28));
    // use accent with alpha ramp
    const ag = ctx.createLinearGradient(0, H * 0.45, 0, H);
    ag.addColorStop(0, hexA(a, 0)); ag.addColorStop(0.6, hexA(a, 0.82)); ag.addColorStop(1, hexA(shade(a, -0.15), 0.95));
    ctx.fillStyle = ag; ctx.fillRect(0, 0, W, H);
  }

  if (FRAME.has(scene.template)) {
    const m = Math.round(W * 0.05);
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = Math.max(2, Math.round(W * 0.004));
    roundRect(ctx, m, m, W - 2 * m, H - 2 * m, Math.round(W * 0.03)); ctx.stroke();
  }

  for (const el of scene.elements) drawEl(ctx, el, o, W, H);
}

function hexA(color: string, a: number): string {
  // color may be #rrggbb or rgb(...)
  let r = 0, g = 0, b = 0;
  if (color.startsWith("#")) { let h = color.slice(1); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16); }
  else { const m = color.match(/\d+/g); if (m) { r = +m[0]; g = +m[1]; b = +m[2]; } }
  return `rgba(${r},${g},${b},${a})`;
}
