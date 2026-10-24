"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { differenceInCalendarDays } from "date-fns";
import {
  Car,
  ShieldCheck,
  Clock,
  MapPin,
  Check,
  Users,
  Fuel,
  Cog,
  CalendarDays,
  MessageCircle,
  Sparkles,
  Star,
  Tag,
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import { createOnlineReservation, type BookingState } from "./actions";
import type { SiteSettings } from "@/lib/site";
import { useLang, dict } from "./i18n";
import { DatePicker, dmy } from "./date-picker";

interface Car2 {
  id: string;
  make: string;
  model: string;
  year: number | null;
  plate: string;
  color: string | null;
  fuel_type: string | null;
  transmission: string | null;
  seats: number | null;
  doors: number | null;
  daily_price_cents: number;
  status: string;
  photos: string[];
  description: string | null;
}
interface Booking {
  vehicle_id: string;
  pickup_at: string;
  return_at: string;
}

const Y = "#FED600";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function isoOf(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtD(s: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Albanian date like "24 nëntor 2026" for the WhatsApp message
const SQ_MONTHS = [
  "janar", "shkurt", "mars", "prill", "maj", "qershor",
  "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor",
];
function fmtSq(s: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${d.getDate()} ${SQ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function buildWaMessage(
  carName: string | undefined,
  from: string,
  to: string,
  fallback: string | undefined
) {
  if (carName && from && to) {
    return `Përshëndetje, e rezervova ${carName} për datat ${fmtSq(from)} - ${fmtSq(to)}`;
  }
  return fallback ?? "";
}

export function BookingApp({
  slug,
  cars,
  bookings,
  currency,
  businessName,
  phone,
  address,
  settings,
}: {
  slug: string;
  cars: Car2[];
  bookings: Booking[];
  currency: string;
  businessName: string;
  phone: string | null;
  address: string | null;
  settings: SiteSettings;
}) {
  const [lang] = useLang();
  const t = dict[lang];
  const todayISO = isoOf(new Date());

  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [step, setStep] = useState<"browse" | "dates" | "detail" | "done">("browse");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailPhoto, setDetailPhoto] = useState(0);
  const [gallery, setGallery] = useState<{ photos: string[]; start: number; title: string } | null>(null);

  // ----- filters (applied) -----
  const [fMake, setFMake] = useState("");
  const [fModel, setFModel] = useState("");
  const [fGear, setFGear] = useState("");
  const [fFuel, setFFuel] = useState("");
  const [fMax, setFMax] = useState("");
  const [fSeats, setFSeats] = useState("");
  // ----- filters (draft inside panel) -----
  const [panelOpen, setPanelOpen] = useState(false);
  const [dMake, setDMake] = useState("");
  const [dModel, setDModel] = useState("");
  const [dGear, setDGear] = useState("");
  const [dFuel, setDFuel] = useState("");
  const [dMax, setDMax] = useState("");
  const [dSeats, setDSeats] = useState("");

  const [state, formAction] = useFormState(createOnlineReservation, {} as BookingState);

  useEffect(() => {
    if (state.ok) {
      setStep("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (state.waPhone) {
        const link = `https://wa.me/${state.waPhone}?text=${encodeURIComponent(buildWaMessage(state.carName, pickupDate, returnDate, state.waText))}`;
        const timer = setTimeout(() => {
          window.location.href = link;
        }, 1400);
        return () => clearTimeout(timer);
      }
    }
  }, [state.ok, state.waPhone, state.waText]);

  // "Book now" in the header (site-chrome) fires this event
  useEffect(() => {
    const h = () => {
      setStep("dates");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("app:book", h);
    return () => window.removeEventListener("app:book", h);
  }, []);

  // Whenever we switch view (open a car, go to dates, done), jump to the top.
  useEffect(() => {
    try {
      window.scrollTo({ top: 0 });
    } catch {}
  }, [step, detailId]);

  // Clicking the logo returns to the booking home (resets any open car/view).
  useEffect(() => {
    const h = () => {
      setStep("browse");
      setDetailId(null);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("app:home", h);
    return () => window.removeEventListener("app:home", h);
  }, []);

  function goToFleet() {
    setStep("browse");
    setTimeout(() => document.getElementById("fleet")?.scrollIntoView({ behavior: "smooth" }), 60);
  }

  const datesValid = useMemo(() => {
    if (!pickupDate || !returnDate) return false;
    return new Date(returnDate) > new Date(pickupDate);
  }, [pickupDate, returnDate]);

  const days = datesValid
    ? Math.max(1, differenceInCalendarDays(new Date(returnDate), new Date(pickupDate)))
    : 0;
  const daysLabel = `${days} ${days === 1 ? t.dayWord : t.daysWord}`;

  function isBookableStatus(c: Car2) {
    return c.status !== "MAINTENANCE" && c.status !== "UNAVAILABLE";
  }
  function bookedForDates(carId: string): boolean {
    if (!datesValid) return false;
    const selStart = new Date(`${pickupDate}T00:00:00`);
    const selEnd = new Date(`${returnDate}T23:59:59`);
    return bookings.some(
      (b) => b.vehicle_id === carId && new Date(b.pickup_at) < selEnd && new Date(b.return_at) > selStart
    );
  }
  function carBookedDates(carId: string): Set<string> {
    const set = new Set<string>();
    bookings
      .filter((b) => b.vehicle_id === carId)
      .forEach((b) => {
        const s = new Date(b.pickup_at);
        const e = new Date(b.return_at);
        const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate());
        const end = new Date(e.getFullYear(), e.getMonth(), e.getDate());
        while (cur < end) {
          set.add(isoOf(cur));
          cur.setDate(cur.getDate() + 1);
        }
      });
    return set;
  }

  const minPrice = cars.length ? Math.min(...cars.map((c) => c.daily_price_cents)) : 0;
  const activeOffers = (settings.offers || []).filter((o) => o.active && (o.title || o.body));
  const featureIcons = [<Car key="c" />, <ShieldCheck key="s" />, <Clock key="cl" />, <MapPin key="m" />];

  // filter option lists
  const makeOpts = Array.from(new Set(cars.map((c) => c.make).filter(Boolean))).sort();
  const modelOpts = Array.from(
    new Set(cars.filter((c) => !dMake || c.make === dMake).map((c) => c.model).filter(Boolean))
  ).sort();
  const gearOpts = Array.from(new Set(cars.map((c) => c.transmission).filter((x): x is string => !!x)));
  const fuelOpts = Array.from(new Set(cars.map((c) => c.fuel_type).filter((x): x is string => !!x)));
  const priceOpts = Array.from(new Set(cars.map((c) => c.daily_price_cents))).sort((a, b) => a - b);
  const seatOpts = Array.from(new Set(cars.map((c) => c.seats).filter((x): x is number => x != null))).sort((a, b) => a - b);

  const appliedCount = [fMake, fModel, fGear, fFuel, fMax, fSeats].filter(Boolean).length;

  const filteredCars = cars.filter((c) => {
    if (fMake && c.make !== fMake) return false;
    if (fModel && c.model !== fModel) return false;
    if (fGear && c.transmission !== fGear) return false;
    if (fFuel && c.fuel_type !== fFuel) return false;
    if (fMax && c.daily_price_cents > Number(fMax)) return false;
    if (fSeats && (c.seats == null || c.seats < Number(fSeats))) return false;
    return true;
  });

  function openPanel() {
    setDMake(fMake); setDModel(fModel); setDGear(fGear); setDFuel(fFuel); setDMax(fMax); setDSeats(fSeats);
    setPanelOpen(true);
  }
  function applyFilters() {
    setFMake(dMake); setFModel(dModel); setFGear(dGear); setFFuel(dFuel); setFMax(dMax); setFSeats(dSeats);
    setPanelOpen(false);
  }
  function clearFilters() {
    setDMake(""); setDModel(""); setDGear(""); setDFuel(""); setDMax(""); setDSeats("");
    setFMake(""); setFModel(""); setFGear(""); setFFuel(""); setFMax(""); setFSeats("");
  }

  const detailCar = cars.find((c) => c.id === detailId) || null;

  function openDetail(c: Car2) {
    setDetailId(c.id);
    setDetailPhoto(0);
    setStep("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------------- DONE ----------------
  if (step === "done" && state.ok) {
    const link = `https://wa.me/${state.waPhone}?text=${encodeURIComponent(buildWaMessage(state.carName, pickupDate, returnDate, state.waText))}`;
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: Y }}>
          <Check className="h-8 w-8 text-black" strokeWidth={3} />
        </div>
        <h1 className="text-3xl font-extrabold">{t.reservationReceived}</h1>
        <p className="mt-3 text-white/70">
          {t.weReserved} <span className="font-semibold text-white">{state.carName}</span> {t.forWord}{" "}
          <span className="font-semibold text-white">{state.from} – {state.to}</span>. {t.tapToConfirm}
        </p>
        <a href={link} className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-base font-bold text-black" style={{ background: Y }}>
          <MessageCircle className="h-5 w-5" /> {t.confirmOnWhatsapp}
        </a>
        <p className="mt-4 text-xs text-white/40">{t.openingWhatsapp}</p>
        <button onClick={() => { setStep("browse"); setDetailId(null); }} className="mt-10 block w-full text-sm text-white/50 hover:text-white">
          {t.backToWebsite}
        </button>
      </main>
    );
  }

  // ---------------- DETAIL ----------------
  if (step === "detail" && detailCar) {
    const c = detailCar;
    const photos = c.photos || [];
    const hasPhotos = photos.length > 0;
    const booked = carBookedDates(c.id);
    const total = datesValid ? days * c.daily_price_cents : 0;
    const bookableNow = isBookableStatus(c) && datesValid && !bookedForDates(c.id);

    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        {gallery && <Lightbox photos={gallery.photos} start={gallery.start} title={gallery.title} onClose={() => setGallery(null)} />}

        <button onClick={() => setStep("browse")} className="mb-6 text-sm text-white/60 hover:text-white">
          {t.backToFleet}
        </button>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* gallery */}
          <div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-800 to-black">
              {hasPhotos ? (
                <button type="button" onClick={() => setGallery({ photos, start: detailPhoto, title: `${c.make} ${c.model}` })} className="block w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photos[detailPhoto]} alt={`${c.make} ${c.model}`} className="h-72 w-full object-cover sm:h-96" />
                </button>
              ) : (
                <div className="flex h-72 items-center justify-center sm:h-96">
                  <Car className="h-20 w-20 text-white/20" />
                </div>
              )}
            </div>
            {photos.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {photos.map((p, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={i}
                    src={p}
                    alt=""
                    onClick={() => setDetailPhoto(i)}
                    className={`h-16 w-24 flex-shrink-0 cursor-pointer rounded-lg object-cover ${i === detailPhoto ? "ring-2 ring-[#FED600]" : "opacity-60 hover:opacity-100"}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* info */}
          <div>
            <h1 className="text-3xl font-extrabold">{c.make} {c.model}</h1>
            {c.year != null && <p className="mt-1 text-white/50">{c.year}</p>}
            <p className="mt-4 text-3xl font-extrabold" style={{ color: Y }}>
              {formatMoney(c.daily_price_cents, currency)}<span className="text-base font-normal text-white/50">{t.perDay}</span>
            </p>

            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-white/80">{t.specifications}</p>
              <div className="grid grid-cols-2 gap-y-2 text-sm text-white/70">
                {c.year != null && <Spec k="Year" v={String(c.year)} />}
                {c.color && <Spec k="Color" v={c.color} />}
                {c.transmission && <Spec k={t.gearbox} v={c.transmission} />}
                {c.fuel_type && <Spec k={t.fuel} v={c.fuel_type} />}
                {c.seats != null && <Spec k={t.seatsMin} v={String(c.seats)} />}
                {c.doors != null && <Spec k="Doors" v={String(c.doors)} />}
              </div>
            </div>
            {c.description && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-white/80">{lang === "sq" ? "Përshkrimi" : "Description"}</p>
                <p className="whitespace-pre-line text-sm text-white/70">{c.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* availability + reserve */}
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-lg font-bold">{t.selectDates}</p>
            <DatePicker
              start={pickupDate}
              end={returnDate}
              onChange={(s, e) => { setPickupDate(s); setReturnDate(e); }}
              minISO={todayISO}
              bookedDates={booked}
              inline
              labels={{ pickup: t.pickupDate, return: t.returnDate }}
              lang={lang}
            />
          </div>

          <div>
            <p className="mb-3 text-lg font-bold">{t.reserveThisCar}</p>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              {datesValid ? (
                <div className="mb-4 space-y-1 text-sm text-white/70">
                  <Row label={t.datesLabel} value={`${fmtD(pickupDate)} – ${fmtD(returnDate)}`} />
                  <Row label={t.durationLabel} value={daysLabel} />
                  <Row label={t.rateLabel} value={`${formatMoney(c.daily_price_cents, currency)}${t.perDay}`} />
                  <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-base">
                    <span className="text-white/70">{t.estimatedTotal}</span>
                    <span className="font-extrabold" style={{ color: Y }}>{formatMoney(total, currency)}</span>
                  </div>
                </div>
              ) : (
                <p className="mb-4 text-sm text-white/50">{t.pickDatesToContinue}</p>
              )}

              <form action={formAction} className="space-y-3">
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="vehicle_id" value={c.id} />
                <input type="hidden" name="pickup_date" value={pickupDate} />
                <input type="hidden" name="return_date" value={returnDate} />
                <input name="name" required className={inputCls} placeholder={t.fullName} />
                <input name="phone" required className={inputCls} placeholder={t.phoneWhatsapp} />
                <input name="email" type="email" className={inputCls} placeholder={t.emailOptional} />
                {state.error && <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">{state.error}</p>}
                <button
                  type="submit"
                  disabled={!bookableNow}
                  className="w-full rounded-lg px-6 py-3.5 text-base font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: Y }}
                >
                  {t.confirmReservation}
                </button>
                <p className="text-center text-xs text-white/40">{t.noPaymentOnline}</p>
              </form>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ---------------- DATES (date-first flow) ----------------
  if (step === "dates") {
    return (
      <main className="mx-auto max-w-lg px-4 py-14">
        <button onClick={() => setStep("browse")} className="mb-6 text-sm text-white/60 hover:text-white">
          {lang === "sq" ? "← Kthehu" : "← Back"}
        </button>
        <h1 className="text-center text-3xl font-extrabold">
          {lang === "sq" ? "Kur të nevojitet makina?" : "When do you need the car?"}
        </h1>
        <p className="mt-2 text-center text-white/60">
          {lang === "sq" ? "Zgjidh datat e marrjes dhe kthimit." : "Pick your pickup and return dates."}
        </p>
        <div className="mt-8 flex justify-center">
          <div className="w-full max-w-sm">
            <DatePicker
              start={pickupDate}
              end={returnDate}
              onChange={(s, e) => { setPickupDate(s); setReturnDate(e); }}
              minISO={todayISO}
              inline
              labels={{ pickup: t.pickupDate, return: t.returnDate }}
              lang={lang}
            />
          </div>
        </div>
        <button
          disabled={!datesValid}
          onClick={goToFleet}
          className="mt-8 w-full rounded-lg px-6 py-3.5 text-base font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: Y }}
        >
          {datesValid
            ? (lang === "sq" ? `Shfaq makinat e lira (${daysLabel})` : `Show available cars (${daysLabel})`)
            : (lang === "sq" ? "Zgjidh datat" : "Select your dates")}
        </button>
        <button onClick={goToFleet} className="mt-4 block w-full text-center text-sm text-white/50 hover:text-white">
          {lang === "sq" ? "Ose shiko të gjitha makinat" : "Or browse all cars"}
        </button>
      </main>
    );
  }

  // ---------------- BROWSE ----------------
  return (
    <main>
      {/* HERO */}
      <section className="relative">
        {/* decorative layers clipped here so the date-picker dropdown below is NOT clipped */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/75 to-black" />
          <div className="absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-[#FED600]/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:py-28">
          {settings.hero.badge && (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70">
              <Sparkles className="h-3.5 w-3.5" style={{ color: Y }} /> {settings.hero.badge}
            </span>
          )}
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            {settings.hero.titleLead} <span style={{ color: Y }}>{settings.hero.titleHighlight}</span>{settings.hero.titleTail}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/60">{settings.hero.subtitle}</p>

          {/* Search card with calendar picker */}
          <div id="book" className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-black/70 p-4 text-left shadow-2xl sm:flex-row sm:items-center">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-white/60">{t.pickupDate} → {t.returnDate}</label>
              <DatePicker
                start={pickupDate}
                end={returnDate}
                onChange={(s, e) => { setPickupDate(s); setReturnDate(e); }}
                minISO={todayISO}
                labels={{ pickup: t.pickupDate, return: t.returnDate }}
                lang={lang}
              />
            </div>
            <a href="#fleet" className="rounded-lg px-6 py-3 text-center text-base font-bold text-black sm:mt-5" style={{ background: Y }}>
              {t.search}
            </a>
          </div>

          <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/50">
            <span className="flex items-center gap-2"><Check className="h-4 w-4" style={{ color: Y }} /> {lang === "sq" ? "Makina moderne" : "Modern cars"}</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4" style={{ color: Y }} /> {t.noDepositOnline}</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4" style={{ color: Y }} /> {t.freeCancellation}</span>
            {minPrice > 0 && (
              <span className="flex items-center gap-2"><Check className="h-4 w-4" style={{ color: Y }} /> {t.fromWord} {formatMoney(minPrice, currency)}{t.perDay}</span>
            )}
          </div>
        </div>
      </section>

      {/* OFFERS */}
      {settings.show.offers && activeOffers.length > 0 && (
        <section id="offers" className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-center text-3xl font-extrabold">{t.currentOffers}</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activeOffers.map((o) => (
              <div key={o.id} className="rounded-2xl border border-[#FED600]/30 bg-[#FED600]/5 p-6">
                {o.badge && (
                  <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-black" style={{ background: Y }}>
                    <Tag className="h-3 w-3" /> {o.badge}
                  </span>
                )}
                {o.title && <p className="mt-3 text-xl font-bold">{o.title}</p>}
                {o.body && <p className="mt-2 text-white/70">{o.body}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FEATURES */}
      {settings.show.features && (
        <section id="why" className="border-y border-white/10 bg-zinc-950">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
            {settings.features.slice(0, 4).map((f, i) => (
              <Feature key={i} icon={featureIcons[i] || <Car />} title={f.title} text={f.text} />
            ))}
          </div>
        </section>
      )}

      {/* FLEET */}
      <section id="fleet" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-extrabold">{t.ourFleet}</h2>
          <p className="mt-2 text-white/60">
            {datesValid
              ? `${t.showingAvailabilityFor} ${fmtD(pickupDate)} – ${fmtD(returnDate)} (${daysLabel})`
              : t.browseHint}
          </p>
        </div>

        {/* Filter button + panel */}
        {cars.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => (panelOpen ? setPanelOpen(false) : openPanel())}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                <SlidersHorizontal className="h-4 w-4" /> {t.filters}
                {appliedCount > 0 && (
                  <span className="ml-1 rounded-full px-2 py-0.5 text-xs font-bold text-black" style={{ background: Y }}>{appliedCount}</span>
                )}
              </button>
              <span className="text-sm text-white/40">{filteredCars.length} {t.carsWord}</span>
            </div>

            {panelOpen && (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <FilterSelect label={t.make} value={dMake} onChange={(v) => { setDMake(v); setDModel(""); }} anyLabel={t.anyOption}
                    options={makeOpts.map((m) => ({ value: m, label: m }))} />
                  <FilterSelect label={t.model} value={dModel} onChange={setDModel} anyLabel={t.anyOption}
                    options={modelOpts.map((m) => ({ value: m, label: m }))} />
                  <FilterSelect label={t.gearbox} value={dGear} onChange={setDGear} anyLabel={t.anyOption}
                    options={gearOpts.map((g) => ({ value: g, label: g }))} />
                  <FilterSelect label={t.fuel} value={dFuel} onChange={setDFuel} anyLabel={t.anyOption}
                    options={fuelOpts.map((f) => ({ value: f, label: f }))} />
                  <FilterSelect label={t.maxPricePerDay} value={dMax} onChange={setDMax} anyLabel={t.anyOption}
                    options={priceOpts.map((p) => ({ value: String(p), label: `≤ ${formatMoney(p, currency)}` }))} />
                  <FilterSelect label={t.seatsMin} value={dSeats} onChange={setDSeats} anyLabel={t.anyOption}
                    options={seatOpts.map((s) => ({ value: String(s), label: `${s}+` }))} />
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button onClick={applyFilters} className="rounded-lg px-5 py-2 text-sm font-bold text-black" style={{ background: Y }}>{t.apply}</button>
                  <button onClick={clearFilters} className="text-sm text-white/60 hover:text-white">{t.clearFilters}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {cars.length === 0 ? (
          <p className="text-center text-white/50">{t.noCarsYet}</p>
        ) : filteredCars.length === 0 ? (
          <p className="text-center text-white/50">{t.noMatch}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCars.map((c) => {
              const bookable = isBookableStatus(c);
              const booked = bookedForDates(c.id);
              const hasPhotos = c.photos && c.photos.length > 0;
              return (
                <div
                  key={c.id}
                  onClick={() => openDetail(c)}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-white/25"
                >
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-zinc-800 to-black">
                    {hasPhotos ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={c.photos[0]} alt={`${c.make} ${c.model}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Car className="h-16 w-16 text-white/20" />
                      </div>
                    )}
                    <div className="absolute right-3 top-3">
                      {!bookable ? (
                        <Badge tone="gray">{t.badgeUnavailable}</Badge>
                      ) : datesValid ? (
                        booked ? <Badge tone="red">{t.badgeBooked}</Badge> : <Badge tone="green">{t.badgeAvailable}</Badge>
                      ) : null}
                    </div>
                    {hasPhotos && c.photos.length > 1 && (
                      <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-2.5 py-0.5 text-xs text-white/80">
                        {c.photos.length} {t.photosWord}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-lg font-bold">{c.make} {c.model}</p>
                    {c.year != null && <p className="text-sm text-white/50">{c.year}</p>}

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
                      {c.seats != null && <Chip icon={<Users className="h-3.5 w-3.5" />}>{c.seats} {t.seatsWord}</Chip>}
                      {c.transmission && <Chip icon={<Cog className="h-3.5 w-3.5" />}>{c.transmission}</Chip>}
                      {c.fuel_type && <Chip icon={<Fuel className="h-3.5 w-3.5" />}>{c.fuel_type}</Chip>}
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                      <p className="text-2xl font-extrabold" style={{ color: Y }}>
                        {formatMoney(c.daily_price_cents, currency)}
                        <span className="text-sm font-normal text-white/50">{t.perDay}</span>
                      </p>
                    </div>

                    <div className="mt-5">
                      <span className="block w-full rounded-lg px-4 py-2.5 text-center text-sm font-bold text-black" style={{ background: Y }}>
                        {t.viewDetailsBook}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      {settings.show.how && (
        <section id="how" className="border-y border-white/10 bg-zinc-950">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-3xl font-extrabold">{t.howItWorks}</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <HowStep n="1" icon={<CalendarDays />} title={t.how1t} text={t.how1b} />
              <HowStep n="2" icon={<Check />} title={t.how2t} text={t.how2b} />
              <HowStep n="3" icon={<MessageCircle />} title={t.how3t} text={t.how3b} />
            </div>
          </div>
        </section>
      )}

      {/* REVIEWS */}
      {settings.show.reviews && settings.reviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-extrabold">{t.reviewsHeading}</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {settings.reviews.slice(0, 6).map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.max(1, Math.min(5, r.rating || 5)) }).map((_, i) => (
                    <Star key={i} className="h-4 w-4" style={{ color: Y }} fill={Y} />
                  ))}
                </div>
                {r.text && <p className="mt-3 text-white/80">“{r.text}”</p>}
                {r.name && <p className="mt-3 text-sm font-semibold">{r.name}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MAP */}
      {settings.show.map && settings.mapQuery && (
        <section id="find-us" className="border-t border-white/10 bg-zinc-950">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-3xl font-extrabold">{t.findUs}</h2>
            {settings.hours && <p className="mt-2 text-center text-white/60">{settings.hours}</p>}
            {address && <p className="mt-1 text-center text-white/40">{address}</p>}
            <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
              <iframe title="Map" src={`https://www.google.com/maps?q=${encodeURIComponent(settings.mapQuery)}&output=embed`} className="h-80 w-full" loading="lazy" />
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-zinc-900 to-black" />
        <div className="absolute -bottom-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-[#FED600]/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-3xl font-extrabold">{settings.cta.title}</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/60">{settings.cta.text}</p>
          <button
            onClick={() => { setStep("dates"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="mt-8 inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-base font-bold text-black"
            style={{ background: Y }}
          >
            {t.bookNow}
          </button>
          {phone && (
            <p className="mt-4 text-sm text-white/50">
              {t.orCallUs} <a href={`tel:${phone}`} className="font-medium text-white hover:underline">{phone}</a>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

/* ---------------- Lightbox ---------------- */
function Lightbox({ photos, start, title, onClose }: { photos: string[]; start: number; title: string; onClose: () => void }) {
  const [i, setI] = useState(start);
  const startX = useRef<number | null>(null);
  const prev = () => setI((v) => (v - 1 + photos.length) % photos.length);
  const next = () => setI((v) => (v + 1) % photos.length);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length]);
  if (photos.length === 0) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="font-semibold">{title} <span className="text-white/40">{i + 1}/{photos.length}</span></span>
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10" aria-label="Close"><X className="h-5 w-5" /></button>
      </div>
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-2"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (startX.current == null) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          if (dx > 40) prev(); else if (dx < -40) next();
          startX.current = null;
        }}
      >
        {photos.length > 1 && (
          <button onClick={prev} className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Previous"><ChevronLeft className="h-6 w-6" /></button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[i]} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        {photos.length > 1 && (
          <button onClick={next} className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Next"><ChevronRight className="h-6 w-6" /></button>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto px-4 py-4" onClick={(e) => e.stopPropagation()}>
          {photos.map((p, idx) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={idx} src={p} alt="" onClick={() => setI(idx)} className={`h-14 w-20 flex-shrink-0 cursor-pointer rounded object-cover ${idx === i ? "ring-2 ring-[#FED600]" : "opacity-50 hover:opacity-100"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- small bits ---------------- */
const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#FED600] focus:outline-none";

function FilterSelect({ label, value, onChange, options, anyLabel }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; anyLabel: string;
}) {
  return (
    <div className="text-left">
      <label className="mb-1 block text-xs font-medium text-white/50">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#FED600] focus:outline-none">
        <option value="" className="bg-zinc-900 text-white">{anyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-zinc-900 text-white">{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/50">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-xs text-white/40">{k}</p>
      <p className="font-medium text-white">{v}</p>
    </div>
  );
}
function Chip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-0.5">{icon}{children}</span>;
}
function Badge({ tone, children }: { tone: "green" | "red" | "gray"; children: React.ReactNode }) {
  const cls = tone === "green" ? "bg-emerald-500/90 text-black" : tone === "red" ? "bg-red-500/90 text-white" : "bg-white/20 text-white";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{children}</span>;
}
function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg" style={{ background: "rgba(254,214,0,0.12)", color: Y }}>{icon}</div>
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-sm text-white/60">{text}</p>
    </div>
  );
}
function HowStep({ n, icon, title, text }: { n: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold text-black" style={{ background: Y }}>{n}</div>
      <div className="mb-3 mt-2 text-white/80">{icon}</div>
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-sm text-white/60">{text}</p>
    </div>
  );
}
