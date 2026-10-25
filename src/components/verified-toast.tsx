"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

// Smooth centered "account verified" confirmation. Shows once when the page is
// reached with ?verified=1 (after entering the code OR clicking the email link),
// then auto-dismisses. The query param is stripped so a refresh won't re-show it.
export function VerifiedToast() {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get("verified") === "1") {
        setShow(true);
        requestAnimationFrame(() => setMounted(true));
        window.history.replaceState({}, "", window.location.pathname);
        timer = setTimeout(() => {
          setMounted(false);
          setTimeout(() => setShow(false), 260);
        }, 3400);
      }
    } catch {}
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  const dismiss = () => {
    setMounted(false);
    setTimeout(() => setShow(false), 260);
  };

  if (!show) return null;

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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="h-8 w-8" strokeWidth={2.4} />
        </div>
        <h2 className="text-xl font-extrabold text-[#2A2320]">Faleminderit! 🎉</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#5B524E]">
          Llogaria u verifikua me sukses. Vazhdo me hapat e mëposhtëm për të rregulluar biznesin tënd.
        </p>
        <button
          onClick={dismiss}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#A11E22] text-sm font-bold text-white transition hover:bg-[#851519]"
        >
          Vazhdo
        </button>
      </div>
    </div>
  );
}
