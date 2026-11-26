"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, Copy, Check, ImageOff, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import {
  OCCASIONS,
  occasionById,
  badgeText,
  carTitle,
  priceLabel,
  specLine,
  buildCaptions,
  type PostOccasion,
  type PostLang,
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
  square: { w: 1080, h: 1080, label: "Square (1:1)" },
  story: { w: 1080, h: 1920, label: "Story (9:16)" },
} as const;
type FormatKey = keyof typeof FORMATS;

// ---- canvas helpers (pure) -------------------------------------------------

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(W / iw, H / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
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
  // ellipsis on the last line if we had to cut
  return lines;
}

interface RenderOpts {
  car: Car;
  business: Business;
  occasion: PostOccasion;
  lang: PostLang;
  accent: string;
  format: FormatKey;
  img: HTMLImageElement | null;
}

function renderCanvas(canvas: HTMLCanvasElement, o: RenderOpts) {
  const { w: W, h: H } = FORMATS[o.format];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const ctxData: PostContext = {
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

  // Background
  if (o.img) {
    drawCover(ctx, o.img, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#1f2937");
    g.addColorStop(1, "#0f172a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Legibility gradient (whole image a touch darker, bottom much darker)
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0.28)");
  grad.addColorStop(0.45, "rgba(0,0,0,0.05)");
  grad.addColorStop(0.72, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const pad = Math.round(W * 0.06);

  // Occasion badge (top-left)
  const badge = badgeText(o.occasion, o.lang);
  if (badge) {
    ctx.font = `800 ${Math.round(W * 0.032)}px system-ui, sans-serif`;
    const tw = ctx.measureText(badge).width;
    const bh = Math.round(W * 0.066);
    const bpadX = Math.round(W * 0.028);
    roundRect(ctx, pad, pad, tw + bpadX * 2, bh, bh / 2);
    ctx.fillStyle = o.accent;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(badge, pad + bpadX, pad + bh / 2 + 2);
  }

  // Bottom content block
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let y = Math.round(H - pad);

  // CTA (phone / booking) — bottom-most
  const ctaParts: string[] = [];
  if (o.business.phone) ctaParts.push((o.lang === "sq" ? "Rezervo: " : "Book: ") + o.business.phone);
  if (o.business.bookingUrl && !o.business.phone) ctaParts.push(o.business.bookingUrl.replace(/^https?:\/\//, ""));
  if (ctaParts.length) {
    ctx.font = `600 ${Math.round(W * 0.03)}px system-ui, sans-serif`;
    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(ctaParts.join("   •   "), pad, y);
    y -= Math.round(W * 0.055);
  }

  // Price pill
  const price = priceLabel(ctxData, o.lang);
  ctx.font = `800 ${Math.round(W * 0.044)}px system-ui, sans-serif`;
  const pw = ctx.measureText(price).width;
  const ph = Math.round(W * 0.085);
  const ppadX = Math.round(W * 0.032);
  y -= ph;
  roundRect(ctx, pad, y, pw + ppadX * 2, ph, Math.round(W * 0.018));
  ctx.fillStyle = o.accent;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(price, pad + ppadX, y + ph / 2 + 2);
  ctx.textBaseline = "alphabetic";
  y -= Math.round(W * 0.03);

  // Spec line
  const specs = specLine(ctxData, o.lang);
  if (specs) {
    ctx.font = `500 ${Math.round(W * 0.03)}px system-ui, sans-serif`;
    ctx.fillStyle = "#d1d5db";
    ctx.fillText(specs, pad, y);
    y -= Math.round(W * 0.05);
  }

  // Car title (big, up to 2 lines)
  const title = carTitle(ctxData);
  let titleSize = Math.round(W * 0.07);
  ctx.font = `800 ${titleSize}px system-ui, sans-serif`;
  let lines = fitLines(ctx, title, W - pad * 2, 2);
  if (lines.length > 1) {
    titleSize = Math.round(W * 0.058);
    ctx.font = `800 ${titleSize}px system-ui, sans-serif`;
    lines = fitLines(ctx, title, W - pad * 2, 2);
  }
  ctx.fillStyle = "#ffffff";
  const lineH = Math.round(titleSize * 1.08);
  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.fillText(lines[i], pad, y);
    y -= lineH;
  }
  y -= Math.round(W * 0.006);

  // Business name (small, accent, uppercase feel)
  if (o.business.name) {
    ctx.font = `700 ${Math.round(W * 0.03)}px system-ui, sans-serif`;
    ctx.fillStyle = o.accent;
    ctx.fillText(o.business.name.toUpperCase(), pad, y);
  }
}

// ---- component -------------------------------------------------------------

export function PostStudio({ business, cars }: { business: Business; cars: Car[] }) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [carId, setCarId] = useState<string>(cars[0]?.id ?? "");
  const [occasion, setOccasion] = useState<PostOccasion>("offer");
  const [format, setFormat] = useState<FormatKey>("square");
  const [lang, setLang] = useState<PostLang>("sq");
  const [accent, setAccent] = useState<string>(occasionById("offer").accent);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgState, setImgState] = useState<"none" | "loading" | "ready" | "error">("none");
  const [captionIdx, setCaptionIdx] = useState(0);
  const [caption, setCaption] = useState("");
  const [copied, setCopied] = useState(false);
  const [exportErr, setExportErr] = useState(false);

  const car = useMemo(() => cars.find((c) => c.id === carId) ?? cars[0], [cars, carId]);
  const photo = car?.photos?.[0] ?? null;

  const captions = useMemo(() => {
    if (!car) return [];
    const ctx: PostContext = {
      businessName: business.name,
      make: car.make,
      model: car.model,
      year: car.year,
      priceValue: car.priceValue,
      phone: business.phone,
      bookingUrl: business.bookingUrl,
      transmission: car.transmission,
      seats: car.seats,
      fuel: car.fuel,
    };
    return buildCaptions(ctx, occasion, lang);
  }, [car, business, occasion, lang]);

  // Reset accent when occasion changes.
  useEffect(() => {
    setAccent(occasionById(occasion).accent);
  }, [occasion]);

  // Keep the editable caption in sync with the selected variant.
  useEffect(() => {
    setCaption(captions[captionIdx] ?? "");
  }, [captions, captionIdx]);

  // Load the car photo (CORS-enabled so the canvas stays exportable).
  useEffect(() => {
    if (!photo) {
      setImg(null);
      setImgState("none");
      return;
    }
    let alive = true;
    setImgState("loading");
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (!alive) return;
      setImg(image);
      setImgState("ready");
    };
    image.onerror = () => {
      if (!alive) return;
      setImg(null);
      setImgState("error");
    };
    image.src = photo;
    return () => {
      alive = false;
    };
  }, [photo]);

  // Redraw whenever anything visual changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !car) return;
    renderCanvas(canvas, { car, business, occasion, lang, accent, format, img });
  }, [car, business, occasion, lang, accent, format, img, imgState]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas || !car) return;
    setExportErr(false);
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          setExportErr(true);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const safe = `${car.make}-${car.model}-${occasion}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        a.href = url;
        a.download = `${safe}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, "image/png");
    } catch {
      setExportErr(true);
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  if (cars.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {t("Add a car with photos first, then come back to create posts.")}
      </div>
    );
  }

  const aspect = format === "square" ? "1 / 1" : "9 / 16";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      {/* Controls */}
      <div className="space-y-5">
        <Field label={t("Car")}>
          <select
            value={carId}
            onChange={(e) => setCarId(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.make} {c.model}{c.year ? ` ${c.year}` : ""}{c.photos.length ? "" : ` — ${t("no photo")}`}
              </option>
            ))}
          </select>
          {imgState === "error" && (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-600">
              <ImageOff className="h-3.5 w-3.5" /> {t("Couldn't load this photo — the post will use a dark background.")}
            </p>
          )}
          {imgState === "none" && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("This car has no photo — add one under Cars for a better post.")}
            </p>
          )}
        </Field>

        <Field label={t("Occasion")}>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOccasion(o.id)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                  (occasion === o.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted")
                }
              >
                {t(o.labelEn)}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("Format")}>
            <div className="flex gap-2">
              {(Object.keys(FORMATS) as FormatKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFormat(k)}
                  className={
                    "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium " +
                    (format === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")
                  }
                >
                  {k === "square" ? t("Post") : t("Story")}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t("Language")}>
            <div className="flex gap-2">
              {(["sq", "en"] as PostLang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={
                    "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium uppercase " +
                    (lang === l ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")
                  }
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <Field label={t("Accent colour")}>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="h-9 w-14 cursor-pointer rounded border border-border bg-background"
            />
            <span className="text-xs text-muted-foreground">{accent}</span>
          </div>
        </Field>

        <button
          type="button"
          onClick={download}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          {t("Download image")}
        </button>
        {exportErr && (
          <p className="text-[11px] text-rose-600">{t("Couldn't export the image. Try a different photo.")}</p>
        )}
      </div>

      {/* Preview + caption */}
      <div className="space-y-5">
        <div className="flex justify-center rounded-xl border border-border bg-muted/40 p-4">
          <canvas
            ref={canvasRef}
            className="max-h-[70vh] w-auto rounded-lg shadow-sm"
            style={{ aspectRatio: aspect, maxWidth: format === "square" ? 440 : 300 }}
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" /> {t("Caption")}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {captions.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCaptionIdx(i)}
                    className={
                      "h-6 w-6 rounded text-xs font-semibold " +
                      (captionIdx === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70")
                    }
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={copyCaption}
                className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t("Copied") : t("Copy")}
              </button>
            </div>
          </div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={7}
            className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm leading-relaxed"
          />
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
