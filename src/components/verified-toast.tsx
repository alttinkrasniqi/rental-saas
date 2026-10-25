"use client";

import { useEffect, useState } from "react";
import { Check, AlertTriangle } from "lucide-react";

type Variant = {
  tone: "success" | "warn";
  title: string;
  body: string;
  button: string;
};

// Maps a URL query flag -> the notice to show. Used on both /onboarding
// (after entering the code or clicking the email link) and /login (when the
// one-click link could not establish a session, e.g. opened on another device).
const VARIANTS: Record<string, Variant> = {
  verified: {
    tone: "success",
    title: "Faleminderit! 🎉",
    body: "Llogaria u verifikua me sukses. Vazhdo me hapat e mëposhtëm për të rregulluar biznesin tënd.",
    button: "Vazhdo",
  },
  confirmed: {
    tone: "success",
    title: "Llogaria u konfirmua! 🎉",
    body: "Email-i yt u konfirmua. Tani kyçu më poshtë për të vazhduar.",
    button: "Në rregull",
  },
};

// Query flags that mean "failed", shown as a warning instead of success.
const FAILED: Variant = {
  tone: "warn",
  title: "Konfirmimi nuk u krye përmes linkut",
  body:
    "Hape linkun në të njëjtën pajisje ku u regjistrove, ose kthehu te regjistrimi dhe fut kodin 6-shifror. Nëse llogaria është tashmë e konfirmuar, thjesht kyçu më poshtë.",
  button: "Në rregull",
};

// Shows a smooth centered confirmation/notice based on the URL query, then
// clears the flag from the URL so a refresh won't re-show it.
export function VerifiedToast() {
  const [variant, setVariant] = useState<Variant | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const p = new URLSearchParams(window.location.search);
      let v: Variant | null = null;
      for (const key of Object.keys(VARIANTS)) {
        if (p.get(key) === "1") { v = VARIANTS[key]; break; }
      }
      if (!v && p.get("confirm") === "failed") v = FAILED;

      if (v) {
        setVariant(v);
        requestAnimationFrame(() => setMounted(true));
        window.history.replaceState({}, "", window.location.pathname);
        if (v.tone === "success") {
          timer = setTimeout(() => {
            setMounted(false);
            setTimeout(() => setVariant(null), 260);
          }, 3600);
        }
      }
    } catch {}
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  const dismiss = () => {
    setMounted(false);
    setTimeout(() => setVariant(null), 260);
  };

  if (!variant) return null;
  const success = variant.tone === "success";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${mounted ? "opacity-100" : "opacity-0"}`}
        onClick={dismiss}
      />
      <div
        className={`relative w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-2xl transition-all duration-300 ${
          mounted ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0"
        }`}
        style={{ fontFamily: "'Plus Jakarta Sans',system-ui,Arial,sans-serif" }}
      >
        <div
          className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
            success ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
          }`}
        >
          {success ? (
            <Check className="h-8 w-8" strokeWidth={2.4} />
          ) : (
            <AlertTriangle className="h-8 w-8" strokeWidth={2.2} />
          )}
        </div>
        <h2 className="text-xl font-extrabold text-[#2A2320]">{variant.title}</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#5B524E]">{variant.body}</p>
        <button
          onClick={dismiss}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#A11E22] text-sm font-bold text-white transition hover:bg-[#851519]"
        >
          {variant.button}
        </button>
      </div>
    </div>
  );
}
