"use client";

import { useState } from "react";
import { addCarPhoto, removeCarPhoto, makeCoverPhoto } from "./photos-actions";
import { saveCarDetails } from "./car-actions";
import type { CarRow } from "./car-types";

const Y = "#FED600";

// Resize/compress an image in the browser to a max 1600px JPEG data URL.
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

const field =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none";

function CarEditor({ car }: { car: CarRow }) {
  // photos
  const [photos, setPhotos] = useState<string[]>(car.photos || []);
  const [busy, setBusy] = useState(false);
  const [pErr, setPErr] = useState<string | null>(null);

  // details
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(car.year != null ? String(car.year) : "");
  const [color, setColor] = useState(car.color ?? "");
  const [fuel, setFuel] = useState(car.fuel_type ?? "");
  const [trans, setTrans] = useState(car.transmission ?? "");
  const [seats, setSeats] = useState(car.seats != null ? String(car.seats) : "");
  const [doors, setDoors] = useState(car.doors != null ? String(car.doors) : "");
  const [price, setPrice] = useState(((car.daily_price_cents ?? 0) / 100).toString());
  const [desc, setDesc] = useState(car.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dErr, setDErr] = useState<string | null>(null);

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPErr(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const dataUrl = await compress(file);
        const r = await addCarPhoto(car.id, dataUrl);
        if (!r.ok) { setPErr(r.error || "Upload failed."); break; }
        if (r.photos) setPhotos(r.photos);
      }
    } finally {
      setBusy(false);
    }
  }
  async function onDelete(url: string) {
    setBusy(true);
    const r = await removeCarPhoto(car.id, url);
    if (r.ok && r.photos) setPhotos(r.photos);
    else if (!r.ok) setPErr(r.error || "Delete failed.");
    setBusy(false);
  }
  async function onCover(url: string) {
    setBusy(true);
    const r = await makeCoverPhoto(car.id, url);
    if (r.ok && r.photos) setPhotos(r.photos);
    setBusy(false);
  }
  async function onSaveDetails() {
    setSaving(true);
    setDErr(null);
    const r = await saveCarDetails(car.id, {
      year: year ? Number(year) : null,
      color: color || null,
      fuel_type: fuel || null,
      transmission: trans || null,
      seats: seats ? Number(seats) : null,
      doors: doors ? Number(doors) : null,
      daily_price_cents: Math.round((Number(price) || 0) * 100),
      description: desc || null,
    });
    setSaving(false);
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else setDErr(r.error || "Save failed.");
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">
            {car.make} {car.model} <span className="font-normal text-gray-400">· {car.plate}</span>
          </p>
          <p className="text-xs text-gray-400">
            {photos.length} photo{photos.length === 1 ? "" : "s"}
            {photos.length > 0 ? " — first one is the cover" : ""}
          </p>
        </div>
        <label className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-black" style={{ background: Y }}>
          {busy ? "Working…" : "+ Add photos"}
          <input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(e) => onPick(e.target.files)} />
        </label>
      </div>

      {pErr && <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{pErr}</p>}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((url, i) => (
            <div key={url} className="relative overflow-hidden rounded-lg border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-28 w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-black" style={{ background: Y }}>
                  COVER
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/55 p-1.5">
                {i !== 0 ? (
                  <button onClick={() => onCover(url)} className="rounded bg-white/90 px-2 py-1 text-[11px] font-semibold text-black hover:bg-white">
                    Make cover
                  </button>
                ) : (<span />)}
                <button onClick={() => onDelete(url)} className="rounded bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-500">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* details editor */}
      <div className="mt-4 border-t border-gray-100 pt-3">
        <button onClick={() => setOpen((v) => !v)} className="text-sm font-semibold text-gray-700 hover:text-gray-900">
          {open ? "▾ Hide details" : "▸ Edit details & description"}
        </button>

        {open && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Year</label>
                <input className={field} type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2021" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Color</label>
                <input className={field} value={color} onChange={(e) => setColor(e.target.value)} placeholder="Black" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Daily price (in your currency)</label>
                <input className={field} type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="45" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Transmission</label>
                <input className={field} value={trans} onChange={(e) => setTrans(e.target.value)} placeholder="Automatic / Manual" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Fuel</label>
                <input className={field} value={fuel} onChange={(e) => setFuel(e.target.value)} placeholder="Petrol / Diesel" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Seats</label>
                  <input className={field} type="number" value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="5" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Doors</label>
                  <input className={field} type="number" value={doors} onChange={(e) => setDoors(e.target.value)} placeholder="4" />
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Description (shown on the car page)</label>
              <textarea className={`${field} min-h-[90px]`} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="A few lines about this car — condition, extras, what makes it a good choice…" />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={onSaveDetails} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-bold text-black disabled:opacity-60" style={{ background: Y }}>
                {saving ? "Saving…" : "Save details"}
              </button>
              {saved && <span className="text-sm font-medium text-green-600">Saved ✓ — live on your site</span>}
              {dErr && <span className="text-sm text-red-600">{dErr}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function WebsiteManager({ cars }: { cars: CarRow[] }) {
  if (cars.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No cars yet. Add cars in the Cars section first, then come back here to add photos and details.
      </p>
    );
  }
  return (
    <div className="space-y-5">
      {cars.map((car) => (
        <CarEditor key={car.id} car={car} />
      ))}
    </div>
  );
}
