"use client";

import { useEffect, useState } from "react";
import { Rocket, LayoutGrid, ListChecks, X, ArrowRight, ArrowLeft } from "lucide-react";
import { useT } from "@/lib/i18n/provider";

const SEEN_KEY = "mr_welcome_seen";

// Shown once (first login after signup). A short slide-by-slide welcome,
// centered on screen; dismiss sets a flag so it never shows again.
export function WelcomeModal() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY) !== "1") {
        setOpen(true);
        // next tick -> entrance animation
        requestAnimationFrame(() => setMounted(true));
      }
    } catch {}
  }, []);

  const close = () => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
    setMounted(false);
    setTimeout(() => setOpen(false), 180);
  };

  if (!open) return null;

  const slides = [
    {
      icon: <Rocket className="h-7 w-7" />,
      title: t("Welcome to MenaxhoRentin!"),
      text: t("Ready to get started? Let's take the first steps together."),
    },
    {
      icon: <LayoutGrid className="h-7 w-7" />,
      title: t("Everything in one place"),
      text: t("Manage your cars, bookings, clients and your online booking page — all from one simple dashboard."),
    },
    {
      icon: <ListChecks className="h-7 w-7" />,
      title: t("Your first steps"),
      text: t("Add your cars, set up your booking page, and start taking reservations. We'll guide you along the way."),
    },
  ];
  const last = i === slides.length - 1;
  const s = slides[i];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${mounted ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      />
      {/* card */}
      <div
        className={`relative w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-2xl transition-all duration-200 ${
          mounted ? "translate-y-0 opacity-100 scale-100" : "translate-y-3 opacity-0 scale-95"
        }`}
      >
        <button
          onClick={close}
          aria-label={t("Skip")}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {s.icon}
        </div>
        <h2 className="text-xl font-bold text-foreground">{s.title}</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{s.text}</p>

        {/* dots */}
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {slides.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-primary" : "w-1.5 bg-primary/25"}`}
            />
          ))}
        </div>

        {/* footer */}
        <div className="mt-6 flex items-center justify-between gap-3">
          {i > 0 ? (
            <button
              onClick={() => setI((v) => v - 1)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {t("Back")}
            </button>
          ) : (
            <button onClick={close} className="h-10 px-1 text-sm font-medium text-muted-foreground hover:text-foreground">
              {t("Skip")}
            </button>
          )}

          {last ? (
            <button
              onClick={close}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              {t("Let's go")} <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setI((v) => v + 1)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              {t("Next")} <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
