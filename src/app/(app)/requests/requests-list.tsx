"use client";

import { useState } from "react";
import { approveRequest, declineRequest } from "./actions";

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

const Y = "#FED600";

function dmy(s: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function RequestsList({ items: initial }: { items: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function act(id: string, kind: "approve" | "decline") {
    setBusy(id);
    setErr(null);
    const r = kind === "approve" ? await approveRequest(id) : await declineRequest(id);
    setBusy(null);
    if (r.ok) setItems((prev) => prev.filter((i) => i.id !== id));
    else setErr(r.error || "Something went wrong.");
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No pending requests right now. New bookings from your website will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {err && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
      {items.map((i) => (
        <div key={i.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">
                {i.carName}
                {i.plate ? <span className="font-normal text-gray-400"> · {i.plate}</span> : null}
              </p>
              <p className="mt-0.5 text-sm text-gray-600">{dmy(i.from)} → {dmy(i.to)}</p>
              <p className="mt-2 text-sm font-medium text-gray-800">{i.customer}</p>
              <p className="text-sm text-gray-500">
                {i.phone && <a href={`tel:${i.phone}`} className="hover:underline">{i.phone}</a>}
                {i.phone && i.email ? " · " : ""}
                {i.email && <a href={`mailto:${i.email}`} className="hover:underline">{i.email}</a>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {i.phone && (
                <a
                  href={`https://wa.me/${i.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  WhatsApp
                </a>
              )}
              <button
                onClick={() => act(i.id, "decline")}
                disabled={busy === i.id}
                className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Decline
              </button>
              <button
                onClick={() => act(i.id, "approve")}
                disabled={busy === i.id}
                className="rounded-lg px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
                style={{ background: Y }}
              >
                {busy === i.id ? "…" : "Approve"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
