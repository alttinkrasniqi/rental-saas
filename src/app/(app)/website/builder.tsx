"use client";

import { useState } from "react";
import type { SiteSettings, Offer, Review } from "@/lib/site";
import { newId } from "@/lib/site";
import { saveSite } from "./site-actions";
import { WebsiteManager } from "./website-manager";
import type { CarRow } from "./car-types";

const Y = "#FED600";

type Contact = { phone: string; email: string; address: string };

const TABS = ["Homepage", "Offers", "Reviews", "Contact", "Design", "Car photos"] as const;
type Tab = (typeof TABS)[number];

export function Builder({
  initialSettings,
  initialContact,
  cars,
}: {
  initialSettings: SiteSettings;
  initialContact: Contact;
  cars: CarRow[];
}) {
  const [tab, setTab] = useState<Tab>("Homepage");
  const [s, setS] = useState<SiteSettings>(initialSettings);
  const [contact, setContact] = useState<Contact>(initialContact);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function patch(p: Partial<SiteSettings>) {
    setS((prev) => ({ ...prev, ...p }));
    setSaved(false);
  }

  async function onSave() {
    setSaving(true);
    setErr(null);
    const r = await saveSite(s, contact);
    setSaving(false);
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      setErr(r.error || "Save failed.");
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              tab === t ? "text-black" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            style={tab === t ? { background: Y } : undefined}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Save bar (not shown on photos tab — photos save instantly) */}
      {tab !== "Car photos" && (
        <div className="mb-5 flex items-center gap-3">
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-bold text-black disabled:opacity-60"
            style={{ background: Y }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="text-sm font-medium text-green-600">Saved ✓ — live on your site</span>}
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      )}

      {tab === "Homepage" && <HomepageTab s={s} patch={patch} />}
      {tab === "Offers" && <OffersTab s={s} patch={patch} />}
      {tab === "Reviews" && <ReviewsTab s={s} patch={patch} />}
      {tab === "Contact" && (
        <ContactTab s={s} patch={patch} contact={contact} setContact={(c) => { setContact(c); setSaved(false); }} />
      )}
      {tab === "Design" && <DesignTab s={s} patch={patch} />}
      {tab === "Car photos" && (
        <div>
          <p className="mb-4 text-sm text-gray-500">Photos save automatically as you add or remove them.</p>
          <WebsiteManager cars={cars} />
        </div>
      )}
    </div>
  );
}

/* ---------------- shared inputs ---------------- */

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-semibold text-gray-600">{children}</label>;
}
const field =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none";

function Text({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input className={field} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function Area({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <textarea className={`${field} min-h-[90px]`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">{children}</div>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-black" />
    </label>
  );
}

/* ---------------- tabs ---------------- */

function HomepageTab({ s, patch }: { s: SiteSettings; patch: (p: Partial<SiteSettings>) => void }) {
  const h = s.hero;
  const c = s.cta;
  return (
    <div className="space-y-5">
      <Card>
        <p className="font-semibold text-gray-900">Hero (top of the page)</p>
        <Text label="Small badge line" value={h.badge} onChange={(v) => patch({ hero: { ...h, badge: v } })} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Text label="Headline — start" value={h.titleLead} onChange={(v) => patch({ hero: { ...h, titleLead: v } })} />
          <Text label="Highlighted word (yellow)" value={h.titleHighlight} onChange={(v) => patch({ hero: { ...h, titleHighlight: v } })} />
          <Text label="Headline — end" value={h.titleTail} onChange={(v) => patch({ hero: { ...h, titleTail: v } })} />
        </div>
        <p className="text-xs text-gray-400">Preview: {h.titleLead} <span className="font-bold" style={{ color: "#b8a400" }}>{h.titleHighlight}</span>{h.titleTail}</p>
        <Area label="Sub-text under the headline" value={h.subtitle} onChange={(v) => patch({ hero: { ...h, subtitle: v } })} />
      </Card>
      <Card>
        <p className="font-semibold text-gray-900">Bottom call-to-action band</p>
        <Text label="Title" value={c.title} onChange={(v) => patch({ cta: { ...c, title: v } })} />
        <Area label="Text" value={c.text} onChange={(v) => patch({ cta: { ...c, text: v } })} />
      </Card>
    </div>
  );
}

function OffersTab({ s, patch }: { s: SiteSettings; patch: (p: Partial<SiteSettings>) => void }) {
  const offers = s.offers;
  function set(i: number, o: Offer) {
    const next = offers.slice();
    next[i] = o;
    patch({ offers: next });
  }
  function add() {
    patch({ offers: [...offers, { id: newId(), title: "", body: "", badge: "", active: true }] });
  }
  function remove(i: number) {
    patch({ offers: offers.filter((_, idx) => idx !== i) });
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Promotions shown in a &quot;Current offers&quot; section on your site. Un-tick &quot;Show&quot; to hide one without deleting it.</p>
      {offers.length === 0 && <p className="text-sm text-gray-400">No offers yet.</p>}
      {offers.map((o, i) => (
        <Card key={o.id}>
          <div className="flex items-center justify-between">
            <Toggle label="Show this offer" checked={o.active} onChange={(v) => set(i, { ...o, active: v })} />
          </div>
          <Text label="Badge (small label, e.g. -20%)" value={o.badge} onChange={(v) => set(i, { ...o, badge: v })} />
          <Text label="Title" value={o.title} onChange={(v) => set(i, { ...o, title: v })} />
          <Area label="Description" value={o.body} onChange={(v) => set(i, { ...o, body: v })} />
          <button onClick={() => remove(i)} className="text-sm font-semibold text-red-600 hover:underline">Delete offer</button>
        </Card>
      ))}
      <button onClick={add} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50">+ Add offer</button>
    </div>
  );
}

function ReviewsTab({ s, patch }: { s: SiteSettings; patch: (p: Partial<SiteSettings>) => void }) {
  const reviews = s.reviews;
  function set(i: number, r: Review) {
    const next = reviews.slice();
    next[i] = r;
    patch({ reviews: next });
  }
  function add() {
    patch({ reviews: [...reviews, { id: newId(), name: "", text: "", rating: 5 }] });
  }
  function remove(i: number) {
    patch({ reviews: reviews.filter((_, idx) => idx !== i) });
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Customer testimonials shown on your site.</p>
      {reviews.length === 0 && <p className="text-sm text-gray-400">No reviews yet.</p>}
      {reviews.map((r, i) => (
        <Card key={r.id}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Customer name" value={r.name} onChange={(v) => set(i, { ...r, name: v })} />
            <div>
              <Label>Stars (1–5)</Label>
              <select className={field} value={r.rating} onChange={(e) => set(i, { ...r, rating: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
              </select>
            </div>
          </div>
          <Area label="Review text" value={r.text} onChange={(v) => set(i, { ...r, text: v })} />
          <button onClick={() => remove(i)} className="text-sm font-semibold text-red-600 hover:underline">Delete review</button>
        </Card>
      ))}
      <button onClick={add} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50">+ Add review</button>
    </div>
  );
}

function ContactTab({
  s,
  patch,
  contact,
  setContact,
}: {
  s: SiteSettings;
  patch: (p: Partial<SiteSettings>) => void;
  contact: Contact;
  setContact: (c: Contact) => void;
}) {
  return (
    <div className="space-y-5">
      <Card>
        <p className="font-semibold text-gray-900">Contact details (header &amp; footer)</p>
        <Text label="Phone (also used for WhatsApp)" value={contact.phone} onChange={(v) => setContact({ ...contact, phone: v })} placeholder="+383 4X XXX XXX" />
        <Text label="Email" value={contact.email} onChange={(v) => setContact({ ...contact, email: v })} />
        <Text label="Address" value={contact.address} onChange={(v) => setContact({ ...contact, address: v })} />
      </Card>
      <Card>
        <p className="font-semibold text-gray-900">Opening hours &amp; map</p>
        <Text label="Opening hours (free text)" value={s.hours} onChange={(v) => patch({ hours: v })} placeholder="Mon–Sat 08:00–20:00" />
        <Text label="Map location (address or place name)" value={s.mapQuery} onChange={(v) => patch({ mapQuery: v })} placeholder="Your business, City" />
        <p className="text-xs text-gray-400">The map uses Google Maps — type the address exactly as you&apos;d search it.</p>
      </Card>
    </div>
  );
}

function DesignTab({ s, patch }: { s: SiteSettings; patch: (p: Partial<SiteSettings>) => void }) {
  const f = s.features;
  function setFeature(i: number, key: "title" | "text", v: string) {
    const next = f.slice();
    next[i] = { ...next[i], [key]: v };
    patch({ features: next });
  }
  const show = s.show;
  return (
    <div className="space-y-5">
      <Card>
        <p className="font-semibold text-gray-900">&quot;Why choose us&quot; cards</p>
        <p className="text-xs text-gray-400">Four cards with fixed icons — edit the title and text.</p>
        {f.slice(0, 4).map((feat, i) => (
          <div key={i} className="grid gap-3 border-t border-gray-100 pt-3 sm:grid-cols-2">
            <Text label={`Card ${i + 1} title`} value={feat.title} onChange={(v) => setFeature(i, "title", v)} />
            <Text label={`Card ${i + 1} text`} value={feat.text} onChange={(v) => setFeature(i, "text", v)} />
          </div>
        ))}
      </Card>
      <Card>
        <p className="font-semibold text-gray-900">Show / hide sections</p>
        <Toggle label="&quot;Why choose us&quot; features" checked={show.features} onChange={(v) => patch({ show: { ...show, features: v } })} />
        <Toggle label="Current offers" checked={show.offers} onChange={(v) => patch({ show: { ...show, offers: v } })} />
        <Toggle label="How it works" checked={show.how} onChange={(v) => patch({ show: { ...show, how: v } })} />
        <Toggle label="Customer reviews" checked={show.reviews} onChange={(v) => patch({ show: { ...show, reviews: v } })} />
        <Toggle label="Find us / map" checked={show.map} onChange={(v) => patch({ show: { ...show, map: v } })} />
      </Card>
    </div>
  );
}
