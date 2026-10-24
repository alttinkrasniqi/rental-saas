"use client";

import { useEffect, useState } from "react";

export type Lang = "en" | "sq";

export const dict: Record<Lang, Record<string, string>> = {
  en: {
    // header / footer
    navFleet: "Fleet",
    navHow: "How it works",
    navWhy: "Why us",
    navContact: "Contact",
    bookNow: "Book now",
    whatsapp: "WhatsApp",
    footerBlurb:
      "Premium car rental made simple. Browse, reserve online and drive — we handle the rest.",
    footerExplore: "Explore",
    footerContact: "Contact",
    footerReserve: "Reserve fast",
    footerOurFleet: "Our fleet",
    chatWhatsapp: "Chat on WhatsApp",
    allRights: "all rights reserved.",
    // hero
    pickupDate: "Pickup date",
    returnDate: "Return date",
    search: "Search",
    carsWord: "cars",
    noDepositOnline: "No deposit online",
    freeCancellation: "Free cancellation",
    fromWord: "From",
    perDay: "/day",
    // filters
    filters: "Filters",
    make: "Make",
    model: "Model",
    maxPricePerDay: "Max price / day",
    seatsMin: "Seats",
    gearbox: "Gearbox",
    fuel: "Fuel",
    anyOption: "Any",
    apply: "Apply",
    clearFilters: "Clear filters",
    // fleet
    ourFleet: "Our fleet",
    showingAvailabilityFor: "Showing availability for",
    daysWord: "days",
    dayWord: "day",
    browseHint: "Pick your dates above to see what's free, or browse everything below.",
    noCarsYet: "No cars to show yet. Please check back soon.",
    noMatch: "No cars match your filters.",
    details: "Details",
    hide: "Hide",
    seatsWord: "seats",
    reserveNow: "Reserve now",
    pickDatesToBook: "Pick dates to book",
    bookedForYourDates: "Booked for your dates",
    notAvailableBtn: "Not available",
    availability: "Availability",
    availableNoUpcoming: "Available — no upcoming bookings.",
    bookedWord: "Booked",
    photosWord: "photos",
    viewPhotos: "View photos",
    viewDetailsBook: "View details & book",
    badgeAvailable: "Available",
    badgeBooked: "Booked",
    badgeUnavailable: "Unavailable",
    // detail screen
    backToFleet: "← Back to fleet",
    specifications: "Specifications",
    selectDates: "Select your dates",
    reserveThisCar: "Reserve this car",
    pickDatesToContinue: "Pick your dates on the calendar to continue.",
    // sections
    currentOffers: "Current offers",
    howItWorks: "How it works",
    how1t: "Choose dates & car",
    how1b: "Enter your pickup and return dates, then pick a car that's free.",
    how2t: "Reserve online",
    how2b: "Fill in your name and number — no payment needed, no account required.",
    how3t: "Confirm & drive",
    how3b: "You're bounced to WhatsApp to confirm with us, and the car is yours.",
    reviewsHeading: "What our customers say",
    findUs: "Find us",
    // reserve
    completeReservation: "Complete your reservation",
    backToCars: "← Back to cars",
    datesLabel: "Dates",
    durationLabel: "Duration",
    rateLabel: "Rate",
    estimatedTotal: "Estimated total",
    noPaymentOnline: "No payment online — you pay on pickup.",
    fullName: "Full name",
    yourNamePh: "Your name",
    phoneWhatsapp: "Phone (WhatsApp)",
    emailOptional: "Email (optional)",
    confirmReservation: "Confirm reservation",
    // done
    reservationReceived: "Reservation received!",
    weReserved: "We've reserved the",
    forWord: "for",
    tapToConfirm:
      "Tap below to confirm with us on WhatsApp and we'll finalise everything.",
    confirmOnWhatsapp: "Confirm on WhatsApp",
    openingWhatsapp: "Opening WhatsApp…",
    backToWebsite: "← Back to the website",
    orCallUs: "Or call us:",
  },
  sq: {
    navFleet: "Flota",
    navHow: "Si funksionon",
    navWhy: "Pse ne",
    navContact: "Kontakti",
    bookNow: "Rezervo tani",
    whatsapp: "WhatsApp",
    footerBlurb:
      "Qira makinash pa komplikime. Shfleto, rezervo online dhe nisu — për pjesën tjetër kujdesemi ne.",
    footerExplore: "Eksploro",
    footerContact: "Kontakti",
    footerReserve: "Rezervo shpejt",
    footerOurFleet: "Flota jonë",
    chatWhatsapp: "Shkruaj në WhatsApp",
    allRights: "të gjitha të drejtat e rezervuara.",
    pickupDate: "Data e marrjes",
    returnDate: "Data e kthimit",
    search: "Kërko",
    carsWord: "makina",
    noDepositOnline: "Pa depozitë online",
    freeCancellation: "Anulim falas",
    fromWord: "Nga",
    perDay: "/ditë",
    filters: "Filtrat",
    make: "Marka",
    model: "Modeli",
    maxPricePerDay: "Çmimi max / ditë",
    seatsMin: "Ulëse",
    gearbox: "Transmisioni",
    fuel: "Karburanti",
    anyOption: "Të gjitha",
    apply: "Apliko",
    clearFilters: "Pastro filtrat",
    ourFleet: "Flota jonë",
    showingAvailabilityFor: "Disponueshmëria për",
    daysWord: "ditë",
    dayWord: "ditë",
    browseHint: "Zgjidh datat lart për të parë çfarë është e lirë, ose shfleto të gjitha më poshtë.",
    noCarsYet: "Ende nuk ka makina. Kthehuni së shpejti.",
    noMatch: "Asnjë makinë nuk përputhet me filtrat.",
    details: "Detajet",
    hide: "Mbyll",
    seatsWord: "ulëse",
    reserveNow: "Rezervo tani",
    pickDatesToBook: "Zgjidh datat për të rezervuar",
    bookedForYourDates: "E zënë për datat tuaja",
    notAvailableBtn: "Jo e disponueshme",
    availability: "Disponueshmëria",
    availableNoUpcoming: "E lirë — pa rezervime të ardhshme.",
    bookedWord: "E zënë",
    photosWord: "foto",
    viewPhotos: "Shiko fotot",
    viewDetailsBook: "Shiko detajet & rezervo",
    badgeAvailable: "E lirë",
    badgeBooked: "E zënë",
    badgeUnavailable: "E padisponueshme",
    backToFleet: "← Kthehu te flota",
    specifications: "Specifikimet",
    selectDates: "Zgjidh datat tuaja",
    reserveThisCar: "Rezervo këtë makinë",
    pickDatesToContinue: "Zgjidh datat në kalendar për të vazhduar.",
    currentOffers: "Oferta aktuale",
    howItWorks: "Si funksionon",
    how1t: "Zgjidh datat & makinën",
    how1b: "Vendos datat e marrjes dhe kthimit, pastaj zgjidh një makinë të lirë.",
    how2t: "Rezervo online",
    how2b: "Plotëso emrin dhe numrin — pa pagesë, pa llogari.",
    how3t: "Konfirmo & nisu",
    how3b: "Kalon te WhatsApp për të konfirmuar me ne, dhe makina është e jotja.",
    reviewsHeading: "Çfarë thonë klientët tanë",
    findUs: "Na gjeni",
    completeReservation: "Përfundo rezervimin",
    backToCars: "← Kthehu te makinat",
    datesLabel: "Datat",
    durationLabel: "Kohëzgjatja",
    rateLabel: "Tarifa",
    estimatedTotal: "Totali i përafërt",
    noPaymentOnline: "Pa pagesë online — paguani kur e merrni.",
    fullName: "Emri i plotë",
    yourNamePh: "Emri juaj",
    phoneWhatsapp: "Telefoni (WhatsApp)",
    emailOptional: "Email (opsionale)",
    confirmReservation: "Konfirmo rezervimin",
    reservationReceived: "Rezervimi u pranua!",
    weReserved: "Rezervuam",
    forWord: "për",
    tapToConfirm:
      "Shtyp më poshtë për të konfirmuar në WhatsApp dhe i rregullojmë të gjitha.",
    confirmOnWhatsapp: "Konfirmo në WhatsApp",
    openingWhatsapp: "Duke hapur WhatsApp…",
    backToWebsite: "← Kthehu te faqja",
    orCallUs: "Ose na telefononi:",
  },
};

const KEY = "app_lang";
const EVT = "app_lang_change";

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === "en" || saved === "sq") setLangState(saved);
    } catch {}
    const handler = (e: any) => setLangState(e.detail as Lang);
    window.addEventListener(EVT, handler);
    return () => window.removeEventListener(EVT, handler);
  }, []);

  const set = (l: Lang) => {
    try {
      window.localStorage.setItem(KEY, l);
    } catch {}
    setLangState(l);
    try {
      window.dispatchEvent(new CustomEvent(EVT, { detail: l }));
    } catch {}
  };

  return [lang, set];
}
