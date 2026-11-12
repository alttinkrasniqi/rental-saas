"use client";

import { useState } from "react";
import { Fuel, Gauge, ImagePlus, Loader2, Trash2, Check, ClipboardCheck, ArrowRight, AlertTriangle } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import {
  saveConditionDetails,
  addConditionPhoto,
  removeConditionPhoto,
  type Phase,
} from "@/app/(app)/rentals/condition-actions";

export type Cond = {
  fuel: number | null;
  odometer: number | null;
  notes: string | null;
  photos: string[];
};

const FUEL_LABELS = ["E", "¼", "½", "¾", "F"];

// Resize/compress to a max 1600px JPEG data URL, so uploads stay small.
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

function PhaseBlock({
  rentalId,
  phase,
  title,
  initial,
}: {
  rentalId: string;
  phase: Phase;
  title: string;
  initial: Cond;
}) {
  const t = useT();
  const [fuel, setFuel] = useState<number | null>(initial.fuel);
  const [odo, setOdo] = useState<string>(initial.odometer != null ? String(initial.odometer) : "");
  const [notes, setNotes] = useState<string>(initial.notes ?? "");
  const [photos, setPhotos] = useState<string[]>(initial.photos ?? []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    setSaved(false);
    const odometer = odo.trim() ? parseInt(odo, 10) : null;
    const r = await saveConditionDetails(rentalId, phase, {
      fuel,
      odometer: odometer != null && !Number.isNaN(odometer) ? odometer : null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      setErr(r.error || t("Save failed."));
    }
  }

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErr(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const dataUrl = await compress(file);
        const r = await addConditionPhoto(rentalId, phase, dataUrl);
        if (!r.ok) {
          setErr(r.error || t("Upload failed."));
          break;
        }
        if (r.photos) setPhotos(r.photos);
      }
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(url: string) {
    setErr(null);
    const r = await removeConditionPhoto(rentalId, phase, url);
    if (r.ok && r.photos) setPhotos(r.photos);
    else if (!r.ok) setErr(r.error || t("Delete failed."));
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-3 text-sm font-semibold">{title}</p>

      {/* Fuel */}
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Fuel className="h-3.5 w-3.5" /> {t("Fuel")}
      </label>
      <div className="mb-4 flex gap-1.5">
        {FUEL_LABELS.map((lab, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setFuel(fuel === i ? null : i)}
            className={cn(
              "h-9 flex-1 rounded-md border text-sm font-semibold transition-colors",
              fuel === i ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:bg-muted"
            )}
          >
            {lab}
          </button>
        ))}
      </div>

      {/* Odometer */}
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Gauge className="h-3.5 w-3.5" /> {t("Odometer (km)")}
      </label>
      <input
        type="number"
        inputMode="numeric"
        value={odo}
        onChange={(e) => setOdo(e.target.value)}
        placeholder={t("e.g. 84500")}
        className="mb-4 h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-primary"
      />

      {/* Notes */}
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("Damage / notes")}</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder={t("e.g. scratch on the rear bumper")}
        className="mb-4 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
      />

      {/* Photos */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {photos.length > 0 ? t("{n} photos", { n: photos.length }) : t("Photos")}
        </span>
        <label
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-card px-2.5 py-1.5 text-xs font-semibold hover:bg-muted",
            uploading && "pointer-events-none opacity-70"
          )}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {uploading ? t("Working…") : t("Add photos")}
          <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => onPick(e.target.files)} />
        </label>
      </div>
      {photos.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <a href={url} target="_blank" rel="noreferrer">
                <img src={url} alt="" className="h-full w-full object-cover" />
              </a>
              <button
                type="button"
                onClick={() => onDelete(url)}
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded bg-rose-600/90 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={t("Delete")}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {err && <p className="mb-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
        {saved ? t("Saved") : t("Save")}
      </button>
    </div>
  );
}

export function RentalCondition({
  rentalId,
  pickup,
  ret,
}: {
  rentalId: string;
  pickup: Cond;
  ret: Cond;
}) {
  const t = useT();

  const kmDriven =
    pickup.odometer != null && ret.odometer != null ? ret.odometer - pickup.odometer : null;
  const fuelDrop =
    pickup.fuel != null && ret.fuel != null && ret.fuel < pickup.fuel ? pickup.fuel - ret.fuel : 0;

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6 pb-3">
        <h3 className="flex items-center gap-2 font-semibold leading-none tracking-tight">
          <ClipboardCheck className="h-4 w-4" /> {t("Car condition")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("Record fuel, kilometres and damage photos at pickup and return.")}</p>
      </div>
      <div className="p-6 pt-0">
        {/* Comparison summary */}
        {(kmDriven != null || fuelDrop > 0) && (
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-muted/60 px-4 py-3 text-sm">
            {kmDriven != null && (
              <span className="flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <b className="font-semibold">{kmDriven.toLocaleString()} km</b>
                <span className="text-muted-foreground">{t("driven")}</span>
              </span>
            )}
            {pickup.fuel != null && ret.fuel != null && (
              <span className="flex items-center gap-1.5">
                <Fuel className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{FUEL_LABELS[pickup.fuel]}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-semibold">{FUEL_LABELS[ret.fuel]}</span>
              </span>
            )}
            {fuelDrop > 0 && (
              <span className="flex items-center gap-1.5 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                {t("Returned with less fuel")}
              </span>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <PhaseBlock rentalId={rentalId} phase="pickup" title={t("At pickup")} initial={pickup} />
          <PhaseBlock rentalId={rentalId} phase="return" title={t("At return")} initial={ret} />
        </div>
      </div>
    </div>
  );
}
