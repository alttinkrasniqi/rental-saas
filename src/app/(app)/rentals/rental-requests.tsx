"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check, X } from "lucide-react";
import { approveRequest, declineRequest } from "../requests/actions";
import { useT } from "@/lib/i18n/provider";

type Item = {
  id: string;
  carName: string;
  plate: string;
  customer: string;
  phone: string;
  email: string;
  from: string;
  to: string;
  createdAt: string;
};

function dmy(s: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function RentalRequests({ items: initial }: { items: Item[] }) {
  const t = useT();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (items.length === 0) return null;

  async function act(id: string, kind: "approve" | "decline") {
    setBusy(id);
    setErr(null);
    const r = kind === "approve" ? await approveRequest(id) : await declineRequest(id);
    setBusy(null);
    if (r.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      router.refresh();
    } else {
      setErr(r.error || t("Something went wrong."));
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50/60 p-4">
      <div className="mb-1 flex items-center gap-2">
        <BellRing className="h-4 w-4 text-amber-600" />
        <h2 className="text-sm font-semibold text-amber-800">{t("Online requests")}</h2>
        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">{items.length}</span>
      </div>
      <p className="mb-3 text-xs text-amber-700">{t("Bookings from your website waiting for approval. The car is held until you decide.")}</p>
      {err && <p className="mb-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
      <div className="space-y-2">
        {items.map((i) => (
          <div key={i.id} className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {i.carName}
                {i.plate ? <span className="font-normal text-muted-foreground"> · {i.plate}</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">{dmy(i.from)} → {dmy(i.to)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {i.customer}
                {i.phone ? ` · ${i.phone}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {i.phone && (
                <a
                  href={`https://wa.me/${i.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm font-medium hover:bg-muted"
                >
                  {t("WhatsApp")}
                </a>
              )}
              <button
                onClick={() => act(i.id, "decline")}
                disabled={busy === i.id}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-rose-300 px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                <X className="h-4 w-4" /> {t("Decline")}
              </button>
              <button
                onClick={() => act(i.id, "approve")}
                disabled={busy === i.id}
                className="inline-flex h-9 items-center gap-1 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> {busy === i.id ? "…" : t("Approve")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
