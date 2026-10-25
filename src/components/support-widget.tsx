"use client";

import { useState } from "react";
import { MessageCircle, X, ChevronDown, Phone, Mail, LifeBuoy } from "lucide-react";
import { SUPPORT_WHATSAPP, SUPPORT_EMAIL } from "@/lib/brand";

// Floating help bubble for the signed-in app. Shows a few common questions,
// and — if the owner still needs help — a WhatsApp / email handoff.

const FAQS: { q: string; a: string }[] = [
  {
    q: "Si i pranoj rezervimet online?",
    a: "Ndaje linkun e faqes tënde (e gjen te Website ose Settings) me klientët. Rezervimet e reja shfaqen te “Kërkesat”, ku i aprovon ose i refuzon me një klik.",
  },
  {
    q: "Si e shtoj një makinë të re?",
    a: "Shko te “Makinat” → “Shto makinë”, plotëso të dhënat dhe çmimin ditor, dhe ruaje. Fotot dhe përshkrimin i shton te “Website”.",
  },
  {
    q: "Si funksionon kalendari?",
    a: "Kalendari tregon automatikisht cilat makina janë të lira dhe të zëna. Kur e shënon një makinë si të kthyer, ajo lirohet menjëherë në të gjitha ekranet.",
  },
  {
    q: "A paguajnë klientët online?",
    a: "Jo. Klientët rezervojnë online dhe paguajnë në marrje — pa pagesa përmes platformës.",
  },
  {
    q: "Si e ndryshoj çmimin ose fotot e një makine?",
    a: "Te “Website” mund të ndryshosh çmimet, përshkrimet dhe fotot e secilës makinë. Ndryshimet shfaqen menjëherë në faqen tënde publike.",
  },
];

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(0);

  const waHref = SUPPORT_WHATSAPP
    ? `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
        "Përshëndetje, kam nevojë për ndihmë me MenaxhoRentin."
      )}`
    : null;
  const mailHref = SUPPORT_EMAIL ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Ndihmë — MenaxhoRentin")}` : null;

  return (
    <>
      {/* Panel */}
      {open && (
        <div className="fixed bottom-36 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-border bg-white shadow-2xl md:bottom-24 md:right-6">
          {/* Header */}
          <div className="bg-primary px-5 py-4 text-primary-foreground">
            <div className="flex items-center gap-2 text-base font-semibold">
              <LifeBuoy className="h-5 w-5" /> Si mund të ndihmojmë?
            </div>
            <p className="mt-0.5 text-sm text-primary-foreground/80">
              Pyetjet më të shpeshta — ose na shkruaj drejtpërdrejt.
            </p>
          </div>

          {/* FAQs */}
          <div className="max-h-[52vh] overflow-y-auto p-2">
            {FAQS.map((f, i) => {
              const isOpen = expanded === i;
              return (
                <div key={i} className="border-b border-border/70 last:border-0">
                  <button
                    onClick={() => setExpanded(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/60"
                  >
                    {f.q}
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <p className="px-3 pb-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Handoff */}
          <div className="border-t border-border bg-muted/40 p-4">
            <p className="mb-2.5 text-sm font-medium text-foreground">Nuk e gjete përgjigjen?</p>
            <div className="flex flex-col gap-2">
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  <Phone className="h-4 w-4" /> Fol me ne në WhatsApp
                </a>
              )}
              {mailHref && (
                <a
                  href={mailHref}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-input bg-white text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  <Mail className="h-4 w-4" /> Na shkruaj email
                </a>
              )}
              {!waHref && !mailHref && (
                <p className="text-sm text-muted-foreground">
                  Kontakti i mbështetjes nuk është konfiguruar ende.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Mbyll ndihmën" : "Ndihmë"}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90 active:scale-95 md:bottom-6 md:right-6"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
