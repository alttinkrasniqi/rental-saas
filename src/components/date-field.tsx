"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

// A date field that ALWAYS displays dd/mm/yyyy (unlike the native <input
// type="date">, whose format follows the browser locale). It stores the value
// as ISO yyyy-mm-dd in a hidden field (for the form / server), and a calendar
// icon opens the native picker for convenience.

function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}
function displayToIso(s: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return "";
  const day = +m[1], mon = +m[2];
  if (mon < 1 || mon > 12 || day < 1 || day > 31) return "";
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const dt = new Date(`${iso}T00:00:00`);
  return isNaN(dt.getTime()) ? "" : iso;
}
function mask(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join("/");
}

export function DateField({
  name,
  value,
  onChange,
  required,
  min,
}: {
  name?: string;
  value: string; // ISO yyyy-mm-dd ("" when empty)
  onChange: (iso: string) => void;
  required?: boolean;
  min?: string;
}) {
  const [text, setText] = useState(isoToDisplay(value));
  useEffect(() => setText(isoToDisplay(value)), [value]);
  const nativeRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <input
        inputMode="numeric"
        placeholder="dd/mm/vvvv"
        value={text}
        required={required}
        onChange={(e) => {
          const m = mask(e.target.value);
          setText(m);
          onChange(displayToIso(m));
        }}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 pr-10 text-sm",
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      />
      <button
        type="button"
        aria-label="Zgjidh datën"
        onClick={() => {
          const el = nativeRef.current;
          if (el?.showPicker) {
            try { el.showPicker(); } catch {}
          }
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        <Calendar className="h-4 w-4" />
      </button>
      {/* Hidden native picker (source of the calendar popup) */}
      <input
        ref={nativeRef}
        type="date"
        value={value}
        min={min}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => onChange(e.target.value)}
        className="absolute right-2 top-1/2 h-px w-px -translate-y-1/2 opacity-0"
        style={{ pointerEvents: "none" }}
      />
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
