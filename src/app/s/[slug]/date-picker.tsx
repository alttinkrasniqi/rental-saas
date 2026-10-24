"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import type { Lang } from "./i18n";

const Y = "#FED600";

const MONTHS: Record<Lang, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  sq: ["Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor", "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor"],
};
const WEEKDAYS: Record<Lang, string[]> = {
  en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  sq: ["Hë", "Ma", "Më", "En", "Pr", "Sh", "Di"],
};

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseISO(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}
export function dmy(s: string) {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

export function DatePicker({
  start,
  end,
  onChange,
  minISO,
  bookedDates,
  inline = false,
  labels,
  lang,
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  minISO?: string;
  bookedDates?: Set<string>;
  inline?: boolean;
  labels: { pickup: string; return: string };
  lang: Lang;
}) {
  const todayISO = iso(new Date());
  const min = minISO || todayISO;
  const [open, setOpen] = useState(inline);
  const [view, setView] = useState<Date>(() => parseISO(start || min));
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (inline) return;
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [inline]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(iso(new Date(year, month, d)));

  function rangeHasBooked(a: string, b: string) {
    if (!bookedDates) return false;
    for (const bd of Array.from(bookedDates)) if (bd >= a && bd < b) return true;
    return false;
  }

  function pick(d: string) {
    if (d < min) return;
    if (bookedDates && bookedDates.has(d)) return;
    if (!start || (start && end)) {
      onChange(d, "");
      return;
    }
    if (d <= start) {
      onChange(d, "");
      return;
    }
    if (rangeHasBooked(start, d)) {
      onChange(d, "");
      return;
    }
    onChange(start, d);
    if (!inline) setOpen(false);
  }

  const calendar = (
    <div className={inline ? "" : "absolute left-0 right-0 top-full z-30 mt-2"}>
      <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setView(new Date(year, month - 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-white">
            {MONTHS[lang][month]} {year}
          </span>
          <button
            type="button"
            onClick={() => setView(new Date(year, month + 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-white/40">
          {WEEKDAYS[lang].map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, idx) => {
            if (!d) return <div key={`e${idx}`} />;
            const isPast = d < min;
            const isBooked = bookedDates ? bookedDates.has(d) : false;
            const isStart = d === start;
            const isEnd = d === end;
            const inRange = start && end && d > start && d < end;
            const disabled = isPast || isBooked;
            const dayNum = Number(d.slice(8, 10));
            let cls = "relative flex h-9 items-center justify-center rounded-lg text-sm ";
            if (disabled) cls += "cursor-not-allowed text-white/20 line-through";
            else if (isStart || isEnd) cls += "font-bold text-black";
            else if (inRange) cls += "bg-[#FED600]/20 text-white";
            else cls += "text-white/80 hover:bg-white/10";
            return (
              <button
                key={d}
                type="button"
                disabled={disabled}
                onClick={() => pick(d)}
                className={cls}
                style={isStart || isEnd ? { background: Y } : undefined}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        {bookedDates && bookedDates.size > 0 && (
          <p className="mt-3 text-center text-[11px] text-white/40">
            <span className="line-through">00</span> = {lang === "sq" ? "e zënë" : "booked"}
          </p>
        )}
      </div>
    </div>
  );

  if (inline) {
    return <div>{calendar}</div>;
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-left text-sm text-white hover:border-white/30"
      >
        <CalendarDays className="h-4 w-4 text-white/50" />
        <span className="flex-1">
          <span className={start ? "text-white" : "text-white/40"}>{start ? dmy(start) : labels.pickup}</span>
          <span className="mx-2 text-white/30">→</span>
          <span className={end ? "text-white" : "text-white/40"}>{end ? dmy(end) : labels.return}</span>
        </span>
      </button>
      {open && calendar}
    </div>
  );
}
