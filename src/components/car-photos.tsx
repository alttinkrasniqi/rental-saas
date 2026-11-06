"use client";

import { useState } from "react";
import { ImagePlus, Star, Trash2, Loader2 } from "lucide-react";
import { addCarPhoto, removeCarPhoto, makeCoverPhoto } from "@/app/(app)/website/photos-actions";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

// Resize/compress an image in the browser to a max 1600px JPEG data URL,
// so uploads stay small and fast regardless of the original photo size.
async function compress(file: File): Promise<string> {
  const dataUrl: string = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
  try {
    const img = document.createElement("img");
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = dataUrl;
    });
    const max = 1600;
    let width = img.width;
    let height = img.height;
    if (width > max || height > max) {
      if (width >= height) {
        height = Math.round((height * max) / width);
        width = max;
      } else {
        width = Math.round((width * max) / height);
        height = max;
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return dataUrl;
  }
}

export function CarPhotos({ vehicleId, initial }: { vehicleId: string; initial: string[] }) {
  const t = useT();
  const [photos, setPhotos] = useState<string[]>(initial ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErr(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const dataUrl = await compress(file);
        const r = await addCarPhoto(vehicleId, dataUrl);
        if (!r.ok) { setErr(r.error || t("Upload failed.")); break; }
        if (r.photos) setPhotos(r.photos);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(url: string) {
    setBusy(true);
    const r = await removeCarPhoto(vehicleId, url);
    if (r.ok && r.photos) setPhotos(r.photos);
    else if (!r.ok) setErr(r.error || t("Delete failed."));
    setBusy(false);
  }

  async function onCover(url: string) {
    setBusy(true);
    const r = await makeCoverPhoto(vehicleId, url);
    if (r.ok && r.photos) setPhotos(r.photos);
    setBusy(false);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {photos.length > 0
            ? t("{n} photos — the first is the cover", { n: photos.length })
            : t("No photos yet — the cover shows as the card background.")}
        </p>
        <label className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90",
          busy && "pointer-events-none opacity-70"
        )}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {busy ? t("Working…") : t("Add photos")}
          <input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(e) => onPick(e.target.files)} />
        </label>
      </div>

      {err && <p className="mb-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((url, i) => (
            <div key={url} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  <Star className="h-2.5 w-2.5 fill-current" /> {t("Cover")}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/55 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                {i !== 0 ? (
                  <button type="button" onClick={() => onCover(url)} className="rounded bg-white/90 px-2 py-1 text-[11px] font-semibold text-black hover:bg-white">
                    {t("Make cover")}
                  </button>
                ) : <span />}
                <button type="button" onClick={() => onDelete(url)} className="inline-flex items-center gap-1 rounded bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-500">
                  <Trash2 className="h-3 w-3" /> {t("Delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <label className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/30 py-10 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5",
          busy && "pointer-events-none opacity-70"
        )}>
          <ImagePlus className="h-6 w-6" />
          {t("Click to add photos of this car")}
          <input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(e) => onPick(e.target.files)} />
        </label>
      )}
    </div>
  );
}
