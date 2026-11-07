"use client";

import { useState } from "react";
import { ImagePlus, Trash2, Loader2, ExternalLink } from "lucide-react";
import { addClientDocument, removeClientDocument, type ClientDoc } from "@/app/(app)/clients/document-actions";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

async function compress(file: File): Promise<string> {
  const dataUrl: string = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
  try {
    const img = document.createElement("img");
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
    const max = 1800;
    let width = img.width;
    let height = img.height;
    if (width > max || height > max) {
      if (width >= height) { height = Math.round((height * max) / width); width = max; }
      else { width = Math.round((width * max) / height); height = max; }
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return dataUrl;
  }
}

export function ClientDocuments({ clientId, initial }: { clientId: string; initial: ClientDoc[] }) {
  const t = useT();
  const [docs, setDocs] = useState<ClientDoc[]>(initial ?? []);
  const [label, setLabel] = useState("id");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const labelText = (l: string) => (l === "id" ? t("ID / Passport") : l === "license" ? t("Driver's license") : t("Other"));

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErr(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const dataUrl = await compress(file);
        const r = await addClientDocument(clientId, dataUrl, label);
        if (!r.ok) { setErr(r.error || t("Upload failed.")); break; }
        if (r.documents) setDocs(r.documents);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(url: string) {
    setBusy(true);
    const r = await removeClientDocument(clientId, url);
    if (r.ok && r.documents) setDocs(r.documents);
    else if (!r.ok) setErr(r.error || t("Delete failed."));
    setBusy(false);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {docs.length > 0 ? t("{n} documents", { n: docs.length }) : t("Scan or photograph the client's ID and license.")}
        </p>
        <div className="flex items-center gap-2">
          <select value={label} onChange={(e) => setLabel(e.target.value)} className="h-9 rounded-md border border-input bg-card px-2 text-sm outline-none focus:border-primary">
            <option value="id">{t("ID / Passport")}</option>
            <option value="license">{t("Driver's license")}</option>
            <option value="other">{t("Other")}</option>
          </select>
          <label className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90",
            busy && "pointer-events-none opacity-70"
          )}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {busy ? t("Working…") : t("Add photos")}
            <input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(e) => onPick(e.target.files)} />
          </label>
        </div>
      </div>

      {err && <p className="mb-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}

      {docs.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {docs.map((d) => (
            <div key={d.url} className="group relative aspect-[3/2] overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.url} alt="" className="h-full w-full object-cover" />
              <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">{labelText(d.label)}</span>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/55 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded bg-white/90 px-2 py-1 text-[11px] font-semibold text-black hover:bg-white">
                  <ExternalLink className="h-3 w-3" /> {t("Open")}
                </a>
                <button type="button" onClick={() => onDelete(d.url)} className="inline-flex items-center gap-1 rounded bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-500">
                  <Trash2 className="h-3 w-3" /> {t("Delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <label className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/30 py-10 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5",
          busy && "pointer-events-none opacity-70"
        )}>
          <ImagePlus className="h-6 w-6" />
          {t("Click to add a document photo")}
          <input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(e) => onPick(e.target.files)} />
        </label>
      )}
    </div>
  );
}
