"use client";

import { useFormState } from "react-dom";
import { createLead, type LeadState } from "./actions";
import { useLang } from "./i18n";

const Y = "#FED600";

const T = {
  sq: {
    heading: "S'gjete kerrin e duhur?",
    sub: "Lëre kërkesën dhe të kontaktojmë me një ofertë.",
    name: "Emri", phone: "Telefoni", datesFrom: "Nga (opsionale)", datesTo: "Deri (opsionale)",
    type: "Çfarë kerri kërkon? (opsionale)", note: "Shënim (opsionale)",
    send: "Dërgo kërkesën", thanks: "Faleminderit! Të kontaktojmë së shpejti.",
    namePh: "Emri juaj", phonePh: "+383 4X XXX XXX", typePh: "p.sh. SUV, automatik, 7 vende",
  },
  en: {
    heading: "Didn't find the right car?",
    sub: "Leave a request and we'll get back to you with an offer.",
    name: "Name", phone: "Phone", datesFrom: "From (optional)", datesTo: "To (optional)",
    type: "What car do you need? (optional)", note: "Note (optional)",
    send: "Send request", thanks: "Thank you! We'll contact you soon.",
    namePh: "Your name", phonePh: "+383 4X XXX XXX", typePh: "e.g. SUV, automatic, 7 seats",
  },
};

export function LeadRequest({ slug }: { slug: string }) {
  const [lang] = useLang();
  const t = T[lang] ?? T.sq;
  const [state, action] = useFormState(createLead, {} as LeadState);

  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
        {state.ok ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(254,214,0,0.15)", color: Y }}>✓</div>
            <p className="text-lg font-bold text-white">{t.thanks}</p>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <input type="hidden" name="slug" value={slug} />
            <div>
              <h2 className="text-2xl font-extrabold text-white">{t.heading}</h2>
              <p className="mt-1 text-sm text-white/60">{t.sub}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.name}>
                <input name="name" required placeholder={t.namePh} className={inp} />
              </Field>
              <Field label={t.phone}>
                <input name="phone" required placeholder={t.phonePh} className={inp} />
              </Field>
              <Field label={t.datesFrom}>
                <input type="date" name="pickup_date" className={inp} />
              </Field>
              <Field label={t.datesTo}>
                <input type="date" name="return_date" className={inp} />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t.type}>
                  <input name="car_type" placeholder={t.typePh} className={inp} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label={t.note}>
                  <textarea name="note" rows={2} className={inp} />
                </Field>
              </div>
            </div>
            {state.error && <p className="text-sm text-red-400">{state.error}</p>}
            <button type="submit" className="h-11 w-full rounded-xl font-bold text-black transition hover:brightness-95" style={{ background: Y }}>
              {t.send}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

const inp = "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-white/60">{label}</span>
      {children}
    </label>
  );
}
