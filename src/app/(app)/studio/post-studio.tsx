"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Download, Copy, Check, ImageOff, Sparkles, Upload, Trash2, Type, Tag, BadgeCheck,
  ImagePlus, Plus, Minus, Bold, AlignLeft, AlignCenter, AlignRight, ChevronUp, ChevronDown, CopyPlus,
} from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { OCCASIONS, occasionById, badgeText, carTitle, priceLabel, specLine, buildCaptions, ACCENT_PRESETS, type PostOccasion, type PostLang, type PostContext } from "@/lib/studio/templates";
import {
  TEMPLATES, createScene, resolveColor, resolveBg, resolveText,
  type Scene, type El, type SceneData, type ColorToken, type BgToken,
} from "@/lib/studio/scene";
import { drawScene, DIMS, type FormatKey } from "@/lib/studio/render";

type Car = { id: string; make: string; model: string; year: number | null; priceValue: string; photos: string[]; transmission: string | null; seats: number | null; fuel: string | null };
type Business = { name: string; phone: string | null; bookingUrl: string | null };

const LOGO_KEY = "menaxho_studio_logo";
const TEXT_COLORS: ColorToken[] = ["white", "light", "muted", "dark", "brand", "accent", "onAccent"];
const FILL_COLORS: BgToken[] = ["accent", "dark", "glass", "plate", "white"];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function PostStudio({ business, cars }: { business: Business; cars: Car[] }) {
  const t = useT();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; sx: number; sy: number; ex: number; ey: number; rw: number; rh: number } | null>(null);

  const [carId, setCarId] = useState(cars[0]?.id ?? "");
  const [occasion, setOccasion] = useState<PostOccasion>("offer");
  const [format, setFormat] = useState<FormatKey>("square");
  const [lang, setLang] = useState<PostLang>("sq");
  const [accent, setAccent] = useState(occasionById("offer").accent);
  const [darken, setDarken] = useState(0.28);
  const [scene, setScene] = useState<Scene>(() => createScene("bold"));
  const [selId, setSelId] = useState<string | null>(null);
  const [snap, setSnap] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });

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

  const data: SceneData = useMemo(() => {
    const c: PostContext = {
      businessName: business.name, make: car?.make ?? "", model: car?.model ?? "", year: car?.year,
      priceValue: car?.priceValue ?? "", phone: business.phone, bookingUrl: business.bookingUrl,
      transmission: car?.transmission, seats: car?.seats, fuel: car?.fuel,
    };
    let cta = "";
    if (business.phone) cta = (lang === "sq" ? "Rezervo: " : "Book: ") + business.phone;
    else if (business.bookingUrl) cta = business.bookingUrl.replace(/^https?:\/\//, "");
    return {
      businessName: business.name, title: car ? carTitle(c) : "", price: car ? priceLabel(c, lang) : "",
      specs: car ? specLine(c, lang) : "", cta, badge: badgeText(occasion, lang),
    };
  }, [business, car, lang, occasion]);

  const captions = useMemo(() => {
    if (!car) return [];
    const c: PostContext = {
      businessName: business.name, make: car.make, model: car.model, year: car.year,
      priceValue: car.priceValue, phone: business.phone, bookingUrl: business.bookingUrl,
      transmission: car.transmission, seats: car.seats, fuel: car.fuel,
    };
    return buildCaptions(c, occasion, lang);
  }, [car, business, occasion, lang]);

  // fonts
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.getElementById("studio-fonts")) {
      const l = document.createElement("link");
      l.id = "studio-fonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&display=swap";
      document.head.appendChild(l);
    }
    let alive = true;
    const f = (document as any).fonts;
    if (!f?.load) return;
    Promise.all([f.load("800 72px Poppins"), f.load("700 40px Poppins"), f.load("600 30px Poppins"), f.load("500 28px Poppins")])
      .then(() => f.ready).then(() => { if (alive) setFontsReady(true); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // saved logo
  useEffect(() => {
    try {
      const d = localStorage.getItem(LOGO_KEY);
      if (d) { const im = new Image(); im.onload = () => setLogo(im); im.src = d; }
    } catch {}
  }, []);

  useEffect(() => { setAccent(occasionById(occasion).accent); }, [occasion]);
  useEffect(() => { setCaption(captions[captionIdx] ?? ""); }, [captions, captionIdx]);

  // car photo
  useEffect(() => {
    if (!photo) { setImg(null); setImgState("none"); return; }
    let alive = true; setImgState("loading");
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => { if (alive) { setImg(im); setImgState("ready"); } };
    im.onerror = () => { if (alive) { setImg(null); setImgState("error"); } };
    im.src = photo;
    return () => { alive = false; };
  }, [photo]);

  const selected = scene.elements.find((e) => e.id === selId) ?? null;

  const patch = useCallback((id: string, p: Partial<El>) => {
    setScene((s) => ({ ...s, elements: s.elements.map((e) => (e.id === id ? { ...e, ...p } : e)) }));
  }, []);

  function pickTemplate(id: string) { setScene(createScene(id)); setSelId(null); }

  // ---- drag ----
  function onElPointerDown(e: React.PointerEvent, el: El) {
    e.stopPropagation();
    setSelId(el.id);
    if (el.locked) return;
    const stage = stageRef.current; if (!stage) return;
    const r = stage.getBoundingClientRect();
    dragRef.current = { id: el.id, sx: e.clientX, sy: e.clientY, ex: el.x, ey: el.y, rw: r.width, rh: r.height };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onElPointerMove(e: React.PointerEvent) {
    const d = dragRef.current; if (!d) return;
    let nx = clamp01(d.ex + (e.clientX - d.sx) / d.rw);
    let ny = clamp01(d.ey + (e.clientY - d.sy) / d.rh);
    const sx = Math.abs(nx - 0.5) < 0.012, sy = Math.abs(ny - 0.5) < 0.012;
    if (sx) nx = 0.5; if (sy) ny = 0.5;
    setSnap({ x: sx, y: sy });
    patch(d.id, { x: nx, y: ny });
  }
  function onElPointerUp(e: React.PointerEvent) {
    dragRef.current = null; setSnap({ x: false, y: false });
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  }

  // ---- element ops ----
  function addEl(kind: El["kind"]) {
    const id = "el" + Math.random().toString(36).slice(2, 7);
    const base: El = kind === "pill"
      ? { id, kind, field: "custom", text: "€00/ditë", x: 0.4, y: 0.45, fontFrac: 0.044, weight: 800, bg: "accent", color: "onAccent", radiusFrac: 0.02 }
      : kind === "badge"
      ? { id, kind, field: "custom", text: "I RI", x: 0.4, y: 0.4, fontFrac: 0.03, weight: 800, bg: "accent", color: "onAccent" }
      : kind === "logo"
      ? { id, kind, field: "custom", x: 0.4, y: 0.4, w: 0.12 }
      : { id, kind: "text", field: "custom", text: t("Your text"), x: 0.35, y: 0.45, fontFrac: 0.05, weight: 700, color: "white", shadow: true };
    setScene((s) => ({ ...s, elements: [...s.elements, base] }));
    setSelId(id);
  }
  function removeEl(id: string) { setScene((s) => ({ ...s, elements: s.elements.filter((e) => e.id !== id) })); setSelId(null); }
  function dupEl(id: string) {
    setScene((s) => {
      const e = s.elements.find((x) => x.id === id); if (!e) return s;
      const nid = "el" + Math.random().toString(36).slice(2, 7);
      return { ...s, elements: [...s.elements, { ...e, id: nid, x: clamp01(e.x + 0.04), y: clamp01(e.y + 0.04) }] };
    });
  }
  function reorder(id: string, dir: -1 | 1) {
    setScene((s) => {
      const i = s.elements.findIndex((e) => e.id === id); if (i < 0) return s;
      const j = i + dir; if (j < 0 || j >= s.elements.length) return s;
      const arr = s.elements.slice();
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...s, elements: arr };
    });
  }

  // ---- logo ----
  function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const d = String(reader.result || "");
      const im = new Image(); im.onload = () => { setLogo(im); try { localStorage.setItem(LOGO_KEY, d); } catch {} }; im.src = d;
    };
    reader.readAsDataURL(file); e.target.value = "";
  }
  function removeLogo() { setLogo(null); try { localStorage.removeItem(LOGO_KEY); } catch {} }

  // ---- export ----
  function download() {
    setExportErr(false);
    try {
      const cv = document.createElement("canvas");
      drawScene(cv, scene, { img, logo, accent, data, format, darken, fam });
      cv.toBlob((blob) => {
        if (!blob) { setExportErr(true); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const safe = `${car?.make}-${car?.model}-${scene.template}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        a.href = url; a.download = `${safe}.png`; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, "image/png");
    } catch { setExportErr(true); }
  }
  async function copyCaption() { try { await navigator.clipboard.writeText(caption); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }

  if (cars.length === 0) {
    return <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("Add a car with photos first, then come back to create posts.")}</div>;
  }

  const dims = DIMS[format];
  const stageMax = format === "square" ? 520 : 360;

  return (
    <div className="space-y-5">
      {/* Template gallery */}
      <TemplateGallery current={scene.template} onPick={pickTemplate} img={img} logo={logo} accent={accent} data={data} fam={fam} darken={darken} t={t} />

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,320px)]">
        {/* Stage */}
        <div className="space-y-3">
          <div className="flex items-center justify-center rounded-xl border border-border bg-muted/40 p-4">
            <div
              ref={stageRef}
              onPointerDown={() => setSelId(null)}
              className="relative overflow-hidden rounded-lg shadow-md"
              style={{ width: "100%", maxWidth: stageMax, aspectRatio: `${dims.w} / ${dims.h}`, containerType: "inline-size", fontFamily: `'${fam}', system-ui, sans-serif` } as React.CSSProperties}
            >
              <StageBg img={img} darken={darken} template={scene.template} accent={accent} />
              {scene.elements.map((el) => (
                <ElementNode
                  key={el.id} el={el} data={data} accent={accent} logo={logo} selected={el.id === selId}
                  onPointerDown={onElPointerDown} onPointerMove={onElPointerMove} onPointerUp={onElPointerUp}
                />
              ))}
              {snap.x && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-sky-400/80" />}
              {snap.y && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-sky-400/80" />}
            </div>
          </div>

          {/* Add + export row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("Add")}:</span>
            <AddBtn icon={Type} label={t("Text")} onClick={() => addEl("text")} />
            <AddBtn icon={Tag} label={t("Price")} onClick={() => addEl("pill")} />
            <AddBtn icon={BadgeCheck} label={t("Badge")} onClick={() => addEl("badge")} />
            <AddBtn icon={ImagePlus} label={t("Logo")} onClick={() => addEl("logo")} />
            <button type="button" onClick={download} className="ml-auto flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Download className="h-4 w-4" /> {t("Download image")}
            </button>
          </div>
          {exportErr && <p className="text-[11px] text-rose-600">{t("Couldn't export the image. Try a different photo.")}</p>}
          {imgState === "error" && <p className="flex items-center gap-1.5 text-[11px] text-amber-600"><ImageOff className="h-3.5 w-3.5" /> {t("Couldn't load this photo — the post will use a dark background.")}</p>}
        </div>

        {/* Right controls / inspector */}
        <div className="space-y-5">
          {selected ? (
            <Inspector el={selected} accent={accent} t={t} patch={patch} remove={removeEl} dup={dupEl} reorder={reorder} deselect={() => setSelId(null)} />
          ) : (
            <BaseControls
              cars={cars} carId={carId} setCarId={setCarId} imgState={imgState}
              occasion={occasion} setOccasion={setOccasion} format={format} setFormat={setFormat}
              lang={lang} setLang={setLang} accent={accent} setAccent={setAccent}
              darken={darken} setDarken={setDarken} logo={logo} onLogoFile={onLogoFile} removeLogo={removeLogo} t={t}
            />
          )}
        </div>
      </div>

      {/* Caption */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> {t("Caption")}</span>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {captions.map((_, i) => (
                <button key={i} type="button" onClick={() => setCaptionIdx(i)} className={"h-6 w-6 rounded text-xs font-semibold " + (captionIdx === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70")}>{i + 1}</button>
              ))}
            </div>
            <button type="button" onClick={copyCaption} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}{copied ? t("Copied") : t("Copy")}
            </button>
          </div>
        </div>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={6} className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm leading-relaxed" />
        <p className="mt-2 text-[11px] text-muted-foreground">{t("Download the image, then paste the caption on Instagram or Facebook.")}{" "}<Link href="/cars" className="text-primary hover:underline">{t("Manage car photos")}</Link></p>
      </div>
    </div>
  );
}

// ---------- stage background (editor proxy of the canvas) ----------
function StageBg({ img, darken, template, accent }: { img: HTMLImageElement | null; darken: number; template: string; accent: string }) {
  const scrim = ["bold", "minimal", "spotlight", "topbar"].includes(template);
  return (
    <>
      {img ? (
        <img src={img.src} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#334155,#0f172a)" }} />
      )}
      <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${darken})` }} />
      {scrim && <div className="absolute inset-x-0 bottom-0 h-[55%]" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.9))" }} />}
      {template === "framed" && (
        <div className="absolute" style={{ inset: "4.5%", border: "2px solid rgba(255,255,255,0.9)" }} />
      )}
    </>
  );
}

// ---------- one element as draggable DOM ----------
function ElementNode({ el, data, accent, logo, selected, onPointerDown, onPointerMove, onPointerUp }: {
  el: El; data: SceneData; accent: string; logo: HTMLImageElement | null; selected: boolean;
  onPointerDown: (e: React.PointerEvent, el: El) => void; onPointerMove: (e: React.PointerEvent) => void; onPointerUp: (e: React.PointerEvent) => void;
}) {
  const common: React.CSSProperties = {
    position: "absolute", left: `${el.x * 100}%`, top: `${el.y * 100}%`,
    cursor: el.locked ? "pointer" : "grab", touchAction: "none",
    outline: selected ? "2px solid #38bdf8" : "none", outlineOffset: 2,
    opacity: el.opacity ?? 1,
  };
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => onPointerDown(e, el),
    onPointerMove, onPointerUp,
  };
  const alignTx = el.align === "center" ? "translateX(-50%)" : el.align === "right" ? "translateX(-100%)" : "none";

  if (el.kind === "panel") {
    return <div {...handlers} style={{ ...common, width: `${(el.w ?? 1) * 100}%`, height: `${(el.h ?? 0.1) * 100}%`, background: resolveBg(el.bg, accent) ?? "rgba(0,0,0,0.5)", borderRadius: `${(el.radiusFrac ?? 0) * 100}cqw` }} />;
  }
  if (el.kind === "logo") {
    if (!logo) return <div {...handlers} style={{ ...common, width: `${(el.w ?? 0.1) * 100}%`, aspectRatio: "2/1", display: "grid", placeItems: "center", background: "rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", fontSize: "2.4cqw" }}>LOGO</div>;
    return <img {...handlers} src={logo.src} alt="" draggable={false} style={{ ...common, height: `${(el.w ?? 0.1) * 100}%`, width: "auto" }} />;
  }
  const text = resolveText(el, data);
  const shown = el.uppercase ? text.toUpperCase() : text;
  const base: React.CSSProperties = {
    ...common, transform: alignTx,
    fontSize: `${(el.fontFrac ?? 0.04) * 100}cqw`, fontWeight: el.weight ?? 700, lineHeight: 1.08,
    whiteSpace: el.maxWFrac ? "normal" : "pre-wrap", maxWidth: el.maxWFrac ? `${el.maxWFrac * 100}%` : undefined,
    textAlign: el.align ?? "left",
  };
  if (el.kind === "pill" || el.kind === "badge") {
    return <div {...handlers} style={{ ...base, whiteSpace: "nowrap", color: resolveColor(el.color, accent), background: resolveBg(el.bg ?? "accent", accent) ?? accent, padding: "0.5cqw 2.6cqw", borderRadius: el.kind === "badge" ? "999px" : `${(el.radiusFrac ?? 0.02) * 100}cqw`, paddingTop: "0.9cqw", paddingBottom: "0.9cqw" }}>{shown || "…"}</div>;
  }
  return <div {...handlers} style={{ ...base, color: resolveColor(el.color, accent), textShadow: el.shadow ? "0 2px 12px rgba(0,0,0,0.55)" : "none" }}>{shown || "…"}</div>;
}

// ---------- template gallery ----------
function TemplateGallery({ current, onPick, img, logo, accent, data, fam, darken, t }: {
  current: string; onPick: (id: string) => void; img: HTMLImageElement | null; logo: HTMLImageElement | null; accent: string; data: SceneData; fam: string; darken: number; t: (k: string) => string;
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("Designs")}</div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {TEMPLATES.map((tp) => (
          <button key={tp.id} type="button" onClick={() => onPick(tp.id)}
            className={"shrink-0 rounded-lg border p-1 transition-colors " + (current === tp.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50")}>
            <Thumb templateId={tp.id} img={img} logo={logo} accent={accent} data={data} fam={fam} darken={darken} />
            <div className="mt-1 text-center text-[10px] font-medium text-muted-foreground">{t(tp.labelEn)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Thumb({ templateId, img, logo, accent, data, fam, darken }: { templateId: string; img: HTMLImageElement | null; logo: HTMLImageElement | null; accent: string; data: SceneData; fam: string; darken: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const sc = createScene(templateId);
    drawScene(cv, sc, { img, logo, accent, data, format: "square", darken, fam });
  }, [templateId, img, logo, accent, data, fam, darken]);
  return <canvas ref={ref} className="h-24 w-24 rounded-md" style={{ width: 96, height: 96 }} />;
}

// ---------- inspector (selected element) ----------
function Inspector({ el, accent, t, patch, remove, dup, reorder, deselect }: {
  el: El; accent: string; t: (k: string) => string; patch: (id: string, p: Partial<El>) => void;
  remove: (id: string) => void; dup: (id: string) => void; reorder: (id: string, d: -1 | 1) => void; deselect: () => void;
}) {
  const isText = el.kind === "text" || el.kind === "pill" || el.kind === "badge";
  const size = el.fontFrac ?? (el.kind === "logo" ? el.w ?? 0.1 : 0.04);
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{t("Edit element")}</span>
        <button type="button" onClick={deselect} className="text-xs text-muted-foreground hover:underline">{t("Done")}</button>
      </div>

      {isText && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("Text")}</label>
          <textarea value={el.text ?? ""} placeholder={el.field && el.field !== "custom" ? t("(auto from car)") : ""} onChange={(e) => patch(el.id, { text: e.target.value })} rows={2} className="w-full resize-y rounded-md border border-border bg-background p-2 text-sm" />
          {el.field && el.field !== "custom" && el.text ? (
            <button type="button" onClick={() => patch(el.id, { text: "" })} className="text-[11px] text-primary hover:underline">{t("Reset to car data")}</button>
          ) : null}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{el.kind === "logo" ? t("Logo size") : t("Size")}</label>
        <div className="flex items-center gap-2">
          <IconBtn icon={Minus} onClick={() => patch(el.id, el.kind === "logo" ? { w: Math.max(0.04, (el.w ?? 0.1) - 0.01) } : { fontFrac: Math.max(0.02, size - 0.005) })} />
          <div className="flex-1 text-center text-xs text-muted-foreground">{Math.round(size * 1000) / 10}</div>
          <IconBtn icon={Plus} onClick={() => patch(el.id, el.kind === "logo" ? { w: Math.min(0.5, (el.w ?? 0.1) + 0.01) } : { fontFrac: Math.min(0.14, size + 0.005) })} />
        </div>
      </div>

      {isText && (
        <>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("Text colour")}</label>
            <div className="flex flex-wrap gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => patch(el.id, { color: c })} title={c}
                  className={"h-7 w-7 rounded-full border-2 " + ((el.color ?? "white") === c ? "border-foreground" : "border-transparent")}
                  style={{ background: resolveColor(c, accent) }} />
              ))}
            </div>
          </div>
          {(el.kind === "pill" || el.kind === "badge") && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("Fill")}</label>
              <div className="flex flex-wrap gap-1.5">
                {FILL_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => patch(el.id, { bg: c })} title={c}
                    className={"h-7 w-7 rounded-md border-2 " + ((el.bg ?? "accent") === c ? "border-foreground" : "border-transparent")}
                    style={{ background: resolveBg(c, accent) ?? "#000" }} />
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <ToggleBtn active={(el.weight ?? 700) >= 800} icon={Bold} onClick={() => patch(el.id, { weight: (el.weight ?? 700) >= 800 ? 600 : 800 })} />
            <div className="mx-1 h-6 w-px bg-border" />
            <ToggleBtn active={(el.align ?? "left") === "left"} icon={AlignLeft} onClick={() => patch(el.id, { align: "left" })} />
            <ToggleBtn active={el.align === "center"} icon={AlignCenter} onClick={() => patch(el.id, { align: "center" })} />
            <ToggleBtn active={el.align === "right"} icon={AlignRight} onClick={() => patch(el.id, { align: "right" })} />
            <button type="button" onClick={() => patch(el.id, { uppercase: !el.uppercase })} className={"ml-1 h-8 rounded-md border px-2 text-[11px] font-bold " + (el.uppercase ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>AA</button>
          </div>
        </>
      )}

      <div className="flex items-center gap-2 border-t border-border pt-3">
        <IconBtn icon={ChevronUp} onClick={() => reorder(el.id, 1)} title={t("Bring forward")} />
        <IconBtn icon={ChevronDown} onClick={() => reorder(el.id, -1)} title={t("Send back")} />
        <IconBtn icon={CopyPlus} onClick={() => dup(el.id)} title={t("Duplicate")} />
        <button type="button" onClick={() => remove(el.id)} className="ml-auto flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-rose-600 hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /> {t("Delete")}</button>
      </div>
    </div>
  );
}

// ---------- base controls (nothing selected) ----------
function BaseControls(p: any) {
  const { cars, carId, setCarId, imgState, occasion, setOccasion, format, setFormat, lang, setLang, accent, setAccent, darken, setDarken, logo, onLogoFile, removeLogo, t } = p;
  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-4">
      <Field label={t("Car")}>
        <select value={carId} onChange={(e) => setCarId(e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
          {cars.map((c: Car) => <option key={c.id} value={c.id}>{c.make} {c.model}{c.year ? ` ${c.year}` : ""}{c.photos.length ? "" : ` — ${t("no photo")}`}</option>)}
        </select>
        {imgState === "none" && <p className="mt-1 text-[11px] text-muted-foreground">{t("This car has no photo — add one under Cars for a better post.")}</p>}
      </Field>
      <Field label={t("Occasion")}>
        <div className="flex flex-wrap gap-2">
          {OCCASIONS.map((o) => <button key={o.id} type="button" onClick={() => setOccasion(o.id)} className={"rounded-full border px-3 py-1.5 text-xs font-medium " + (occasion === o.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{t(o.labelEn)}</button>)}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t("Format")}>
          <div className="flex gap-2">
            {(["square", "story"] as FormatKey[]).map((k) => <button key={k} type="button" onClick={() => setFormat(k)} className={"flex-1 rounded-md border px-2 py-1.5 text-xs font-medium " + (format === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{k === "square" ? t("Post") : t("Story")}</button>)}
          </div>
        </Field>
        <Field label={t("Language")}>
          <div className="flex gap-2">
            {(["sq", "en"] as PostLang[]).map((l) => <button key={l} type="button" onClick={() => setLang(l)} className={"flex-1 rounded-md border px-2 py-1.5 text-xs font-medium uppercase " + (lang === l ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{l}</button>)}
          </div>
        </Field>
      </div>
      <Field label={t("Accent colour")}>
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((c: string) => <button key={c} type="button" onClick={() => setAccent(c)} className={"h-7 w-7 rounded-full border-2 " + (accent.toLowerCase() === c.toLowerCase() ? "border-foreground" : "border-transparent")} style={{ backgroundColor: c }} />)}
          <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-border bg-background" />
        </div>
      </Field>
      <Field label={t("Logo")}>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <Upload className="h-3.5 w-3.5" /> {logo ? t("Replace logo") : t("Upload logo")}
            <input type="file" accept="image/*" onChange={onLogoFile} className="hidden" />
          </label>
          {logo && <button type="button" onClick={removeLogo} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-rose-600 hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /> {t("Remove")}</button>}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{t("Saved in this browser. Transparent PNG works best.")}</p>
      </Field>
      <Field label={`${t("Photo darkness")} · ${Math.round(darken * 100)}%`}>
        <input type="range" min={0} max={70} value={Math.round(darken * 100)} onChange={(e) => setDarken(Number(e.target.value) / 100)} className="w-full accent-primary" />
      </Field>
      <p className="text-[11px] text-muted-foreground">{t("Tip: tap any element on the post to move or edit it.")}</p>
    </div>
  );
}

// ---------- tiny UI bits ----------
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</label>{children}</div>;
}
function AddBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted"><Icon className="h-3.5 w-3.5" /> {label}</button>;
}
function IconBtn({ icon: Icon, onClick, title }: { icon: any; onClick: () => void; title?: string }) {
  return <button type="button" title={title} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"><Icon className="h-4 w-4" /></button>;
}
function ToggleBtn({ active, icon: Icon, onClick }: { active: boolean; icon: any; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={"flex h-8 w-8 items-center justify-center rounded-md border " + (active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}><Icon className="h-4 w-4" /></button>;
}

type CarType = Car;
