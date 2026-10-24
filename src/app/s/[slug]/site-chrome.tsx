"use client";

import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { useLang, dict, type Lang } from "./i18n";

type Biz = {
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
} | null;

function Wordmark({ name }: { name: string }) {
  return <span className="text-xl font-extrabold tracking-tight text-white">{name}</span>;
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex overflow-hidden rounded-md border border-white/15 text-xs font-bold">
      {(["sq", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={lang === l ? "px-2.5 py-1.5 text-black" : "px-2.5 py-1.5 text-white/60 hover:text-white"}
          style={lang === l ? { background: "#FED600" } : undefined}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function SiteChrome({ biz, slug, children }: { biz: Biz; slug: string; children: React.ReactNode }) {
  const [lang, setLang] = useLang();
  const t = dict[lang];
  const waDigits = (biz?.phone || "").replace(/[^0-9]/g, "");
  const brandName = biz?.name || "Car rental";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href={`/s/${slug}`}
            className="flex items-center"
            onClick={() => { try { window.dispatchEvent(new CustomEvent("app:home")); } catch {} }}
          >
            <Wordmark name={brandName} />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <a href="#fleet" className="hover:text-white">{t.navFleet}</a>
            <a href="#how" className="hover:text-white">{t.navHow}</a>
            <a href="#why" className="hover:text-white">{t.navWhy}</a>
            <a href="#contact" className="hover:text-white">{t.navContact}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LangToggle lang={lang} setLang={setLang} />
            {waDigits && (
              <a
                href={`https://wa.me/${waDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 sm:inline-flex"
              >
                <MessageCircle className="h-4 w-4" /> {t.whatsapp}
              </a>
            )}
            <button
              onClick={() => {
                try { window.dispatchEvent(new CustomEvent("app:book")); } catch {}
              }}
              className="rounded-md bg-[#FED600] px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-[#ffe23a]"
            >
              {t.bookNow}
            </button>
          </div>
        </div>
      </header>

      {children}

      {/* Footer */}
      <footer id="contact" className="border-t border-white/10 bg-zinc-950">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-4"><Wordmark name={brandName} /></div>
            <p className="max-w-xs text-sm text-white/50">{t.footerBlurb}</p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">{t.footerExplore}</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><a href="#fleet" className="hover:text-white">{t.footerOurFleet}</a></li>
              <li><a href="#how" className="hover:text-white">{t.navHow}</a></li>
              <li><a href="#why" className="hover:text-white">{t.navWhy}</a></li>
              <li><a href="#book" className="hover:text-white">{t.bookNow}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">{t.footerContact}</h4>
            <ul className="space-y-2 text-sm text-white/60">
              {biz?.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#FED600]" />
                  <a href={`tel:${biz.phone}`} className="hover:text-white">{biz.phone}</a>
                </li>
              )}
              {biz?.email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#FED600]" />
                  <a href={`mailto:${biz.email}`} className="hover:text-white">{biz.email}</a>
                </li>
              )}
              {biz?.address && (
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#FED600]" /> {biz.address}
                </li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">{t.footerReserve}</h4>
            {waDigits ? (
              <a
                href={`https://wa.me/${waDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#FED600] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#ffe23a]"
              >
                <MessageCircle className="h-4 w-4" /> {t.chatWhatsapp}
              </a>
            ) : (
              <a href="#book" className="inline-flex items-center gap-2 rounded-lg bg-[#FED600] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#ffe23a]">
                {t.bookNow}
              </a>
            )}
          </div>
        </div>
        <div className="border-t border-white/10 py-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} {brandName} — {t.allRights}
        </div>
      </footer>
    </div>
  );
}
