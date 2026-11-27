"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Download, Copy, Check, ImageOff, Sparkles, Upload, Trash2, Type, Tag, BadgeCheck, ImagePlus,
  Plus, Minus, Bold, AlignLeft, AlignCenter, AlignRight, ChevronUp, ChevronDown, CopyPlus,
  Undo2, Redo2, ClipboardCopy, Save, RotateCcw, X, Loader2,
} from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { OCCASIONS, occasionById, badgeText, carTitle, priceLabel, specLine, buildCaptions, ACCENT_PRESETS, type PostOccasion, type PostLang, type PostContext } from "@/lib/studio/templates";
import { TEMPLATES, createScene, resolveColor, resolveBg, resolveText, type Scene, type El, type SceneData, type ColorToken, type BgToken } from "@/lib/studio/scene";
import { drawScene, DIMS, type FormatKey } from "@/lib/studio/render";
import { addCarPhoto } from "@/app/(app)/website/photos-actions";

type Car = { id: string; make: string; model: string; year: number | null; priceValue: string; photos: string[]; transmission: string | null; seats: number | null; fuel: string | null };
type Business = { name: string; phone: string | null; bookingUrl: string | null };

const LOGO_KEY = "menaxho_studio_logo";
const DESIGN_KEY = "menaxho_studio_design";
const TEXT_COLORS: ColorToken[] = ["white", "light", "muted", "dark", "brand", "accent", "onAccent"];
const FILL_COLORS: BgToken[] = ["accent", "dark", "glass", "plate", "white"];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const FILTERS: { id: string; labelEn: string; css: string }[] = [
  { id: "none", labelEn: "Original", css: "" },
  { id: "vivid", labelEn: "Vivid", css: "saturate(1.4) contrast(1.08)" },
  { id: "warm", labelEn: "Warm", css: "saturate(1.15) sepia(0.18) contrast(1.05)" },
  { id: "cool", labelEn: "Cool", css: "saturate(1.1) hue-rotate(-12deg) brightness(1.03)" },
  { id: "mono", labelEn: "Mono", css: "grayscale(1) contrast(1.05)" },
  { id: "dark", labelEn: "Moody", css: "brightness(0.82) contrast(1.12) saturate(1.1)" },
];
const STICKERS = ["ME QIRA", "I LIRË", "ME ULJE", "24/7", "I RI", "LIRIM", "PA DEPOZITË", "KM PA LIMIT"];

// Resize/compress a picked image to a <=1600px JPEG data URL before upload.
async function compress(file: File): Promise<string> {
  const dataUrl: string = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = rej; fr.readAsDataURL(file); });
  try {
    const img = document.createElement("img");
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
    const max = 1600; let w = img.width, h = img.height;
    if (w > max || h > max) { if (w >= h) { h = Math.round((h * max) / w); w = max; } else { w = Math.round((w * max) / h); h = max; } }
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d"); if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h); return c.toDataURL("image/jpeg", 0.82);
  } catch { return dataUrl; }
}

export function PostStudio({ business, cars }: { business: Business; cars: Car[] }) {
  const t = useT();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; sx: number; sy: number; ex: number; ey: number; rw: number; rh: number } | null>(null);

  const [carId, setCarId] = useState(cars[0]?.id ?? "");
  const [carsState, setCarsState] = useState<Car[]>(cars);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [occasion, setOccasion] = useState<PostOccasion>("offer");
  const [format, setFormat] = useState<FormatKey>("square");
  const [lang, setLang] = useState<PostLang>("sq");
  const [accent, setAccent] = useState(occasionById("offer").accent);
  const [darken, setDarken] = useState(0.28);
  const [filterId, setFilterId] = useState("none");
  const [scene, setScene] = useState<Scene>(() => createScene("bold"));
  const [past, setPast] = useState<Scene[]>([]);
  const [future, setFuture] = useState<Scene[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [snap, setSnap] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgState, setImgState] = useState<"none" | "loading" | "ready" | "error">("none");
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const [captionIdx, setCaptionIdx] = useState(0);
  const [caption, setCaption] = useState("");
  const [copied, setCopied] = useState(false);
  const [imgCopied, setImgCopied] = useState(false);
  const [exportErr, setExportErr] = useState(false);

  const car = useMemo(() => carsState.find((c) => c.id === carId) ?? carsState[0], [carsState, carId]);
  const photo = car?.photos?.[photoIdx] ?? car?.photos?.[0] ?? null;
  const fam = fontsReady ? "Poppins" : "system-ui";
  const filterCss = FILTERS.find((f) => f.id === filterId)?.css ?? "";

  const data: SceneData = useMemo(() => {
    const c: PostContext = { businessName: business.name, make: car?.make ?? "", model: car?.model ?? "", year: car?.year, priceValue: car?.priceValue ?? "", phone: business.phone, bookingUrl: business.bookingUrl, transmission: car?.transmission, seats: car?.seats, fuel: car?.fuel };
    let cta = "";
    if (business.phone) cta = (lang === "sq" ? "Rezervo: " : "Book: ") + business.phone;
    else if (business.bookingUrl) cta = business.bookingUrl.replace(/^https?:\/\//, "");
    return { businessName: business.name, title: car ? carTitle(c) : "", price: car ? priceLabel(c, lang) : "", specs: car ? specLine(c, lang) : "", cta, badge: badgeText(occasion, lang) };
  }, [business, car, lang, occasion]);

  const captions = useMemo(() => {
    if (!car) return [];
    const c: PostContext = { businessName: business.name, make: car.make, model: car.model, year: car.year, priceValue: car.priceValue, phone: business.phone, bookingUrl: business.bookingUrl, transmission: car.transmission, seats: car.seats, fuel: car.fuel };
    return buildCaptions(c, occasion, lang);
  }, [car, business, occasion, lang]);

  // fonts
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.getElementById("studio-fonts")) {
      const l = document.createElement("link"); l.id = "studio-fonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&display=swap";
      document.head.appendChild(l);
    }
    let alive = true; const f = (document as any).fonts; if (!f?.load) return;
    Promise.all([f.load("800 72px Poppins"), f.load("700 40px Poppins"), f.load("600 30px Poppins"), f.load("500 28px Poppins")]).then(() => f.ready).then(() => { if (alive) setFontsReady(true); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    try { const d = localStorage.getItem(LOGO_KEY); if (d) { const im = new Image(); im.onload = () => setLogo(im); im.src = d; } } catch {}
    try { setHasSaved(!!localStorage.getItem(DESIGN_KEY)); } catch {}
  }, []);

  useEffect(() => { setAccent(occasionById(occasion).accent); }, [occasion]);
  useEffect(() => { setCaption(captions[captionIdx] ?? ""); }, [captions, captionIdx]);
  useEffect(() => { setPhotoIdx(0); }, [carId]);

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

  // history-aware setters
  const apply = useCallback((next: Scene) => { setPast((p) => [...p.slice(-80), scene]); setFuture([]); setScene(next); }, [scene]);
  const patch = useCallback((id: string, p: Partial<El>) => apply({ ...scene, elements: scene.elements.map((e) => (e.id === id ? { ...e, ...p } : e)) }), [apply, scene]);
  const patchLive = useCallback((id: string, p: Partial<El>) => setScene((s) => ({ ...s, elements: s.elements.map((e) => (e.id === id ? { ...e, ...p } : e)) })), []);
  const undo = useCallback(() => { setPast((p) => { if (!p.length) return p; const prev = p[p.length - 1]; setFuture((f) => [scene, ...f].slice(0, 80)); setScene(prev); return p.slice(0, -1); }); }, [scene]);
  const redo = useCallback(() => { setFuture((f) => { if (!f.length) return f; const nx = f[0]; setPast((p) => [...p, scene].slice(-80)); setScene(nx); return f.slice(1); }); }, [scene]);

  function snapshot() { setPast((p) => [...p.slice(-80), scene]); setFuture([]); }

  function pickTemplate(id: string) { apply(createScene(id)); setSelId(null); setEditId(null); }

  // drag
  function onElPointerDown(e: React.PointerEvent, el: El) {
    e.stopPropagation(); setSelId(el.id);
    if (el.locked || editId === el.id) return;
    const stage = stageRef.current; if (!stage) return;
    const r = stage.getBoundingClientRect();
    snapshot();
    dragRef.current = { id: el.id, sx: e.clientX, sy: e.clientY, ex: el.x, ey: el.y, rw: r.width, rh: r.height };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); e.preventDefault();
  }
  function onElPointerMove(e: React.PointerEvent) {
    const d = dragRef.current; if (!d) return;
    let nx = clamp01(d.ex + (e.clientX - d.sx) / d.rw), ny = clamp01(d.ey + (e.clientY - d.sy) / d.rh);
    const sx = Math.abs(nx - 0.5) < 0.012, sy = Math.abs(ny - 0.5) < 0.012;
    if (sx) nx = 0.5; if (sy) ny = 0.5;
    setSnap({ x: sx, y: sy }); patchLive(d.id, { x: nx, y: ny });
  }
  function onElPointerUp(e: React.PointerEvent) { dragRef.current = null; setSnap({ x: false, y: false }); try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {} }

  // element ops
  function addEl(kind: El["kind"], text?: string) {
    const id = "el" + Math.random().toString(36).slice(2, 7);
    const base: El = kind === "pill"
      ? { id, kind, field: "custom", text: text ?? "€00/ditë", x: 0.4, y: 0.45, fontFrac: 0.044, weight: 800, bg: "accent", color: "onAccent", radiusFrac: 0.02 }
      : kind === "badge"
      ? { id, kind, field: "custom", text: text ?? "I RI", x: 0.4, y: 0.4, fontFrac: 0.03, weight: 800, bg: "accent", color: "onAccent" }
      : kind === "logo"
      ? { id, kind, field: "custom", x: 0.4, y: 0.4, w: 0.12 }
      : { id, kind: "text", field: "custom", text: text ?? t("Your text"), x: 0.35, y: 0.45, fontFrac: 0.05, weight: 700, color: "white", shadow: true };
    apply({ ...scene, elements: [...scene.elements, base] }); setSelId(id);
  }
  function removeEl(id: string) { apply({ ...scene, elements: scene.elements.filter((e) => e.id !== id) }); setSelId(null); setEditId(null); }
  function dupEl(id: string) { const e = scene.elements.find((x) => x.id === id); if (!e) return; const nid = "el" + Math.random().toString(36).slice(2, 7); apply({ ...scene, elements: [...scene.elements, { ...e, id: nid, x: clamp01(e.x + 0.04), y: clamp01(e.y + 0.04) }] }); setSelId(nid); }
  function reorder(id: string, dir: -1 | 1) { const i = scene.elements.findIndex((e) => e.id === id); if (i < 0) return; const j = i + dir; if (j < 0 || j >= scene.elements.length) return; const arr = scene.elements.slice(); [arr[i], arr[j]] = [arr[j], arr[i]]; apply({ ...scene, elements: arr }); }

  // keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (ae.isContentEditable || ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.tagName === "SELECT")) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && (e.key === "z" || e.key === "Z")) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (meta && (e.key === "y" || e.key === "Y")) { e.preventDefault(); redo(); return; }
      if (e.key === "Escape") { setSelId(null); setEditId(null); return; }
      if (!selId) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeEl(selId); return; }
      const step = e.shiftKey ? 0.02 : 0.005;
      const el = scene.elements.find((x) => x.id === selId); if (!el || el.locked) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); patch(selId, { x: clamp01(el.x - step) }); }
      else if (e.key === "ArrowRight") { e.preventDefault(); patch(selId, { x: clamp01(el.x + step) }); }
      else if (e.key === "ArrowUp") { e.preventDefault(); patch(selId, { y: clamp01(el.y - step) }); }
      else if (e.key === "ArrowDown") { e.preventDefault(); patch(selId, { y: clamp01(el.y + step) }); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selId, scene, undo, redo, patch]);

  // logo
  function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const d = String(reader.result || ""); const im = new Image(); im.onload = () => { setLogo(im); try { localStorage.setItem(LOGO_KEY, d); } catch {} }; im.src = d; };
    reader.readAsDataURL(file); e.target.value = "";
  }
  function removeLogo() { setLogo(null); try { localStorage.removeItem(LOGO_KEY); } catch {} }

  async function uploadCarPhoto(file: File) {
    if (!car) return;
    setUploadingPhoto(true);
    try {
      const dataUrl = await compress(file);
      const r = await addCarPhoto(car.id, dataUrl);
      if (r.ok && r.photos) { const np = r.photos; setCarsState((cs) => cs.map((c) => (c.id === car.id ? { ...c, photos: np } : c))); setPhotoIdx(np.length - 1); }
    } finally { setUploadingPhoto(false); }
  }

  // my design
  function saveDesign() { try { localStorage.setItem(DESIGN_KEY, JSON.stringify(scene)); setHasSaved(true); } catch {} }
  function applyDesign() { try { const d = localStorage.getItem(DESIGN_KEY); if (d) { apply(JSON.parse(d)); setSelId(null); } } catch {} }
  function resetDesign() { apply(createScene(scene.template)); setSelId(null); }

  // export
  function makeCanvas() { const cv = document.createElement("canvas"); drawScene(cv, scene, { img, logo, accent, data, format, darken, fam, filter: filterCss }); return cv; }
  function download() {
    setExportErr(false);
    try {
      makeCanvas().toBlob((blob) => {
        if (!blob) { setExportErr(true); return; }
        const url = URL.createObjectURL(blob); const a = document.createElement("a");
        const safe = `${car?.make}-${car?.model}-${scene.template}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        a.href = url; a.download = `${safe}.png`; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, "image/png");
    } catch { setExportErr(true); }
  }
  async function copyImage() {
    try {
      const blob: Blob = await new Promise((res, rej) => makeCanvas().toBlob((b) => (b ? res(b) : rej()), "image/png"));
      await (navigator.clipboard as any).write([new (window as any).ClipboardItem({ "image/png": blob })]);
      setImgCopied(true); setTimeout(() => setImgCopied(false), 1500);
    } catch { download(); }
  }
  async function copyCaption() { try { await navigator.clipboard.writeText(caption); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }

  if (carsState.length === 0) return <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("Add a car with photos first, then come back to create posts.")}</div>;

  const dims = DIMS[format];
  const stageMax = format === "square" ? 520 : 360;

  return (
    <div className="space-y-5">
      <TemplateGallery current={scene.template} onPick={pickTemplate} img={img} logo={logo} accent={accent} data={data} fam={fam} darken={darken} filter={filterCss} t={t} />

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,320px)]">
        <div className="space-y-3">
          {/* top bar: undo/redo + save */}
          <div className="flex flex-wrap items-center gap-2">
            <IconBtn icon={Undo2} onClick={undo} title={t("Undo")} disabled={!past.length} />
            <IconBtn icon={Redo2} onClick={redo} title={t("Redo")} disabled={!future.length} />
            <div className="mx-1 h-6 w-px bg-border" />
            <button type="button" onClick={saveDesign} className="flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted"><Save className="h-3.5 w-3.5" /> {t("Save my design")}</button>
            {hasSaved && <button type="button" onClick={applyDesign} className="flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted">{t("Apply my design")}</button>}
            <button type="button" onClick={resetDesign} className="flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted"><RotateCcw className="h-3.5 w-3.5" /> {t("Reset")}</button>
          </div>

          <div className="flex items-center justify-center rounded-2xl border border-border/50 p-6" style={{ background: "radial-gradient(circle at 50% 28%, #222a3d 0%, #0e121b 100%)" }}>
            <div ref={stageRef} onPointerDown={() => { setSelId(null); setEditId(null); }}
              className="relative overflow-hidden rounded-lg shadow-md"
              style={{ width: "100%", maxWidth: stageMax, aspectRatio: `${dims.w} / ${dims.h}`, containerType: "inline-size", fontFamily: `'${fam}', system-ui, sans-serif` } as React.CSSProperties}>
              <StageBg img={img} darken={darken} template={scene.template} accent={accent} filter={filterCss} />
              {scene.elements.map((el) => (
                <ElementNode key={el.id} el={el} data={data} accent={accent} logo={logo} selected={el.id === selId} editing={el.id === editId}
                  onPointerDown={onElPointerDown} onPointerMove={onElPointerMove} onPointerUp={onElPointerUp}
                  onStartEdit={() => { if (el.kind !== "logo" && el.kind !== "panel") { snapshot(); setEditId(el.id); } }}
                  onEditInput={(txt) => patchLive(el.id, { text: txt })} onEndEdit={() => setEditId(null)}
                  onDup={() => dupEl(el.id)} onDelete={() => removeEl(el.id)} t={t} />
              ))}
              {snap.x && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-sky-400/80" />}
              {snap.y && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-sky-400/80" />}
            </div>
          </div>

          {/* add + export */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("Add")}:</span>
            <AddBtn icon={Type} label={t("Text")} onClick={() => addEl("text")} />
            <AddBtn icon={Tag} label={t("Price")} onClick={() => addEl("pill")} />
            <AddBtn icon={BadgeCheck} label={t("Badge")} onClick={() => addEl("badge")} />
            <AddBtn icon={ImagePlus} label={t("Logo")} onClick={() => addEl("logo")} />
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={copyImage} className="flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">{imgCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <ClipboardCopy className="h-4 w-4" />}{imgCopied ? t("Copied") : t("Copy image")}</button>
              <button type="button" onClick={download} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Download className="h-4 w-4" /> {t("Download image")}</button>
            </div>
          </div>
          {/* sticker chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("Stickers")}:</span>
            {STICKERS.map((s) => <button key={s} type="button" onClick={() => addEl("badge", s)} className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted">{s}</button>)}
          </div>
          {exportErr && <p className="text-[11px] text-rose-600">{t("Couldn't export the image. Try a different photo.")}</p>}
          {imgState === "error" && <p className="flex items-center gap-1.5 text-[11px] text-amber-600"><ImageOff className="h-3.5 w-3.5" /> {t("Couldn't load this photo — the post will use a dark background.")}</p>}
        </div>

        <div className="space-y-5">
          {selected ? (
            <Inspector el={selected} accent={accent} t={t} patch={patch} remove={removeEl} dup={dupEl} reorder={reorder} startEdit={() => setEditId(selected.id)} deselect={() => setSelId(null)} />
          ) : (
            <BaseControls {...{ cars: carsState, carId, setCarId, car, photoIdx, setPhotoIdx, imgState, uploadCarPhoto, uploadingPhoto, occasion, setOccasion, format, setFormat, lang, setLang, accent, setAccent, darken, setDarken, filterId, setFilterId, logo, onLogoFile, removeLogo, t }} />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> {t("Caption")}</span>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">{captions.map((_, i) => <button key={i} type="button" onClick={() => setCaptionIdx(i)} className={"h-6 w-6 rounded text-xs font-semibold " + (captionIdx === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70")}>{i + 1}</button>)}</div>
            <button type="button" onClick={copyCaption} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">{copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}{copied ? t("Copied") : t("Copy")}</button>
          </div>
        </div>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={6} className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm leading-relaxed" />
        <p className="mt-2 text-[11px] text-muted-foreground">{t("Download the image, then paste the caption on Instagram or Facebook.")}{" "}<Link href="/cars" className="text-primary hover:underline">{t("Manage car photos")}</Link></p>
      </div>
    </div>
  );
}

function StageBg({ img, darken, template, accent, filter }: { img: HTMLImageElement | null; darken: number; template: string; accent: string; filter: string }) {
  const scrim = ["bold", "minimal", "spotlight", "topbar"].includes(template);
  return (
    <>
      {img ? <img src={img.src} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" style={{ filter: filter || undefined }} />
        : <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#334155,#0f172a)" }} />}
      <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${darken})` }} />
      {scrim && <div className="absolute inset-x-0 bottom-0 h-[55%]" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.9))" }} />}
      {template === "framed" && <div className="absolute" style={{ inset: "4.5%", border: "2px solid rgba(255,255,255,0.9)" }} />}
    </>
  );
}

function ElementNode({ el, data, accent, logo, selected, editing, onPointerDown, onPointerMove, onPointerUp, onStartEdit, onEditInput, onEndEdit, onDup, onDelete, t }: {
  el: El; data: SceneData; accent: string; logo: HTMLImageElement | null; selected: boolean; editing: boolean;
  onPointerDown: (e: React.PointerEvent, el: El) => void; onPointerMove: (e: React.PointerEvent) => void; onPointerUp: (e: React.PointerEvent) => void;
  onStartEdit: () => void; onEditInput: (txt: string) => void; onEndEdit: () => void; onDup: () => void; onDelete: () => void; t: (k: string) => string;
}) {
  const editRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (editing && editRef.current) { editRef.current.textContent = resolveText(el, data); editRef.current.focus(); const r = document.createRange(); r.selectNodeContents(editRef.current); const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(r); } /* eslint-disable-next-line */ }, [editing]);

  const common: React.CSSProperties = { position: "absolute", left: `${el.x * 100}%`, top: `${el.y * 100}%`, cursor: el.locked ? "pointer" : editing ? "text" : "grab", touchAction: "none", outline: selected ? "2px solid #38bdf8" : "none", outlineOffset: 2, opacity: el.opacity ?? 1 };
  const handlers = editing ? {} : { onPointerDown: (e: React.PointerEvent) => onPointerDown(e, el), onPointerMove, onPointerUp, onDoubleClick: onStartEdit };
  const alignTx = el.align === "center" ? "translateX(-50%)" : el.align === "right" ? "translateX(-100%)" : "none";

  const toolbar = selected && !editing && !el.locked ? (
    <div style={{ position: "absolute", bottom: "100%", right: 0, display: "flex", gap: 4, marginBottom: 4 }}>
      <MiniBtn icon={CopyPlus} onClick={onDup} />
      <MiniBtn icon={X} onClick={onDelete} />
    </div>
  ) : null;

  if (el.kind === "panel") return <div {...handlers} style={{ ...common, width: `${(el.w ?? 1) * 100}%`, height: `${(el.h ?? 0.1) * 100}%`, background: resolveBg(el.bg, accent) ?? "rgba(0,0,0,0.5)", borderRadius: `${(el.radiusFrac ?? 0) * 100}cqw` }}>{toolbar}</div>;
  if (el.kind === "logo") {
    if (!logo) return <div {...handlers} style={{ ...common, width: `${(el.w ?? 0.1) * 100}%`, aspectRatio: "2/1", display: "grid", placeItems: "center", background: "rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", fontSize: "2.4cqw" }}>LOGO{toolbar}</div>;
    return <div {...handlers} style={{ ...common, height: `${(el.w ?? 0.1) * 100}%` }}><img src={logo.src} alt="" draggable={false} style={{ height: "100%", width: "auto", display: "block" }} />{toolbar}</div>;
  }
  const shown = el.uppercase ? resolveText(el, data).toUpperCase() : resolveText(el, data);
  const base: React.CSSProperties = { ...common, transform: alignTx, fontSize: `${(el.fontFrac ?? 0.04) * 100}cqw`, fontWeight: el.weight ?? 700, lineHeight: 1.08, whiteSpace: el.maxWFrac ? "normal" : "pre-wrap", maxWidth: el.maxWFrac ? `${el.maxWFrac * 100}%` : undefined, textAlign: el.align ?? "left" };
  const isPill = el.kind === "pill" || el.kind === "badge";
  const pillStyle: React.CSSProperties = isPill ? { whiteSpace: "nowrap", color: resolveColor(el.color, accent), background: resolveBg(el.bg ?? "accent", accent) ?? accent, padding: "0.9cqw 2.6cqw", borderRadius: el.kind === "badge" ? "999px" : `${(el.radiusFrac ?? 0.02) * 100}cqw` } : { color: resolveColor(el.color, accent), textShadow: el.shadow ? "0 2px 12px rgba(0,0,0,0.55)" : "none" };

  if (editing) {
    return <div ref={editRef} contentEditable suppressContentEditableWarning onInput={(e) => onEditInput((e.currentTarget.textContent ?? ""))} onBlur={onEndEdit}
      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); } }}
      style={{ ...base, ...pillStyle, outline: "2px solid #38bdf8", cursor: "text", minWidth: "4cqw" }} />;
  }
  return <div {...handlers} style={{ ...base, ...pillStyle }}>{shown || "…"}{toolbar}</div>;
}

function TemplateGallery({ current, onPick, img, logo, accent, data, fam, darken, filter, t }: { current: string; onPick: (id: string) => void; img: HTMLImageElement | null; logo: HTMLImageElement | null; accent: string; data: SceneData; fam: string; darken: number; filter: string; t: (k: string) => string }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("Designs")}</div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {TEMPLATES.map((tp) => (
          <button key={tp.id} type="button" onClick={() => onPick(tp.id)} className={"shrink-0 rounded-xl border p-1.5 transition-all hover:-translate-y-0.5 " + (current === tp.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50")}>
            <Thumb templateId={tp.id} img={img} logo={logo} accent={accent} data={data} fam={fam} darken={darken} filter={filter} />
            <div className="mt-1 text-center text-[10px] font-medium text-muted-foreground">{t(tp.labelEn)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
function Thumb({ templateId, img, logo, accent, data, fam, darken, filter }: { templateId: string; img: HTMLImageElement | null; logo: HTMLImageElement | null; accent: string; data: SceneData; fam: string; darken: number; filter: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => { const cv = ref.current; if (!cv) return; drawScene(cv, createScene(templateId), { img, logo, accent, data, format: "square", darken, fam, filter }); }, [templateId, img, logo, accent, data, fam, darken, filter]);
  return <canvas ref={ref} style={{ width: 108, height: 108 }} className="rounded-lg" />;
}

function Inspector({ el, accent, t, patch, remove, dup, reorder, startEdit, deselect }: { el: El; accent: string; t: (k: string) => string; patch: (id: string, p: Partial<El>) => void; remove: (id: string) => void; dup: (id: string) => void; reorder: (id: string, d: -1 | 1) => void; startEdit: () => void; deselect: () => void }) {
  const isText = el.kind === "text" || el.kind === "pill" || el.kind === "badge";
  const size = el.fontFrac ?? (el.kind === "logo" ? el.w ?? 0.1 : 0.04);
  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex items-center justify-between"><span className="text-sm font-semibold">{t("Edit element")}</span><button type="button" onClick={deselect} className="text-xs text-muted-foreground hover:underline">{t("Done")}</button></div>
      {isText && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("Text")}</label>
          <textarea value={el.text ?? ""} placeholder={el.field && el.field !== "custom" ? t("(auto from car)") : ""} onChange={(e) => patch(el.id, { text: e.target.value })} rows={2} className="w-full resize-y rounded-md border border-border bg-background p-2 text-sm" />
          {el.field && el.field !== "custom" && el.text ? <button type="button" onClick={() => patch(el.id, { text: "" })} className="text-[11px] text-primary hover:underline">{t("Reset to car data")}</button> : null}
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
          <div className="space-y-1.5"><label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("Text colour")}</label>
            <div className="flex flex-wrap gap-1.5">{TEXT_COLORS.map((c) => <button key={c} type="button" onClick={() => patch(el.id, { color: c })} className={"h-7 w-7 rounded-full border-2 " + ((el.color ?? "white") === c ? "border-foreground" : "border-transparent")} style={{ background: resolveColor(c, accent) }} />)}</div>
          </div>
          {(el.kind === "pill" || el.kind === "badge") && (
            <div className="space-y-1.5"><label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("Fill")}</label>
              <div className="flex flex-wrap gap-1.5">{FILL_COLORS.map((c) => <button key={c} type="button" onClick={() => patch(el.id, { bg: c })} className={"h-7 w-7 rounded-md border-2 " + ((el.bg ?? "accent") === c ? "border-foreground" : "border-transparent")} style={{ background: resolveBg(c, accent) ?? "#000" }} />)}</div>
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
          <button type="button" onClick={startEdit} className="w-full rounded-md border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-muted">{t("Edit text on post")}</button>
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

function BaseControls(p: any) {
  const { cars, carId, setCarId, car, photoIdx, setPhotoIdx, imgState, uploadCarPhoto, uploadingPhoto, occasion, setOccasion, format, setFormat, lang, setLang, accent, setAccent, darken, setDarken, filterId, setFilterId, logo, onLogoFile, removeLogo, t } = p;
  const photos: string[] = car?.photos ?? [];
  return (
    <div className="space-y-5 rounded-2xl border border-border/70 bg-card p-4">
      <Field label={t("Car")}>
        <select value={carId} onChange={(e) => setCarId(e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
          {cars.map((c: Car) => <option key={c.id} value={c.id}>{c.make} {c.model}{c.year ? ` ${c.year}` : ""}{c.photos.length ? "" : ` — ${t("no photo")}`}</option>)}
        </select>
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((ph: string, i: number) => (
            <button key={i} type="button" onClick={() => setPhotoIdx(i)} className={"h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 " + (photoIdx === i ? "border-primary" : "border-transparent")}>
              <img src={ph} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
          <label className="flex h-14 w-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:bg-muted">
            {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            <span className="text-[9px] font-medium">{t("Add")}</span>
            <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCarPhoto(f); e.target.value = ""; }} />
          </label>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{t("Pick a photo for this car, or upload one right here.")}</p>
      </Field>
      <Field label={t("Photo filter")}>
        <div className="flex flex-wrap gap-2">{FILTERS.map((f) => <button key={f.id} type="button" onClick={() => setFilterId(f.id)} className={"rounded-md border px-2.5 py-1.5 text-xs font-medium " + (filterId === f.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{t(f.labelEn)}</button>)}</div>
      </Field>
      <Field label={t("Occasion")}><div className="flex flex-wrap gap-2">{OCCASIONS.map((o) => <button key={o.id} type="button" onClick={() => setOccasion(o.id)} className={"rounded-full border px-3 py-1.5 text-xs font-medium " + (occasion === o.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{t(o.labelEn)}</button>)}</div></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t("Format")}><div className="flex gap-2">{(["square", "story"] as FormatKey[]).map((k) => <button key={k} type="button" onClick={() => setFormat(k)} className={"flex-1 rounded-md border px-2 py-1.5 text-xs font-medium " + (format === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{k === "square" ? t("Post") : t("Story")}</button>)}</div></Field>
        <Field label={t("Language")}><div className="flex gap-2">{(["sq", "en"] as PostLang[]).map((l) => <button key={l} type="button" onClick={() => setLang(l)} className={"flex-1 rounded-md border px-2 py-1.5 text-xs font-medium uppercase " + (lang === l ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{l}</button>)}</div></Field>
      </div>
      <Field label={t("Accent colour")}><div className="flex flex-wrap items-center gap-2">{ACCENT_PRESETS.map((c: string) => <button key={c} type="button" onClick={() => setAccent(c)} className={"h-7 w-7 rounded-full border-2 " + (accent.toLowerCase() === c.toLowerCase() ? "border-foreground" : "border-transparent")} style={{ backgroundColor: c }} />)}<input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-border bg-background" /></div></Field>
      <Field label={t("Logo")}>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"><Upload className="h-3.5 w-3.5" /> {logo ? t("Replace logo") : t("Upload logo")}<input type="file" accept="image/*" onChange={onLogoFile} className="hidden" /></label>
          {logo && <button type="button" onClick={removeLogo} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-rose-600 hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /> {t("Remove")}</button>}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{t("Saved in this browser. Transparent PNG works best.")}</p>
      </Field>
      <Field label={`${t("Photo darkness")} · ${Math.round(darken * 100)}%`}><input type="range" min={0} max={70} value={Math.round(darken * 100)} onChange={(e) => setDarken(Number(e.target.value) / 100)} className="w-full accent-primary" /></Field>
      <p className="text-[11px] text-muted-foreground">{t("Tip: tap any element to move it; double-tap text to edit it.")}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</label>{children}</div>; }
function AddBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted"><Icon className="h-3.5 w-3.5" /> {label}</button>; }
function IconBtn({ icon: Icon, onClick, title, disabled }: { icon: any; onClick: () => void; title?: string; disabled?: boolean }) { return <button type="button" title={title} onClick={onClick} disabled={disabled} className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"><Icon className="h-4 w-4" /></button>; }
function ToggleBtn({ active, icon: Icon, onClick }: { active: boolean; icon: any; onClick: () => void }) { return <button type="button" onClick={onClick} className={"flex h-8 w-8 items-center justify-center rounded-md border " + (active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}><Icon className="h-4 w-4" /></button>; }
function MiniBtn({ icon: Icon, onClick }: { icon: any; onClick: () => void }) {
  return <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onClick(); }} style={{ width: 24, height: 24, borderRadius: 6, background: "#0f172a", color: "#fff", display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,0.2)" }}><Icon className="h-3.5 w-3.5" /></button>;
}
