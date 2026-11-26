"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Star } from "lucide-react";
import { submitReview, type ReviewState } from "../actions";
import { useLang } from "../i18n";

const Y = "#FED600";

const T = {
  sq: {
    heading: "Si ishte përvoja juaj?",
    low: "Na vjen keq. Çfarë mund të përmirësojmë?",
    high: "Shto një koment (opsionale)",
    namePh: "Emri juaj (opsionale)",
    send: "Dërgo",
    thanks: "Faleminderit për vlerësimin!",
    googleMsg: "Na ndihmon shumë nëse e lini edhe në Google:",
<<<<<<< HEAD
    googleBtn: "Lër vlerësim në Google",
=======
    googleBtn: "Lër recension në Google",
>>>>>>> a15c1f53b8252a602eaafa1f02b8a3bd605a485d
    choose: "Zgjidh një vlerësim.",
  },
  en: {
    heading: "How was your experience?",
    low: "Sorry to hear that. What could we improve?",
    high: "Add a comment (optional)",
    namePh: "Your name (optional)",
    send: "Send",
    thanks: "Thanks for your rating!",
    googleMsg: "It helps us a lot if you leave it on Google too:",
    googleBtn: "Leave a review on Google",
    choose: "Please choose a rating.",
  },
};

export function ReviewApp({ slug, businessName, googleUrl }: { slug: string; businessName: string; googleUrl: string | null }) {
  const [lang] = useLang();
  const t = T[lang] ?? T.sq;
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, action] = useFormState(submitReview, {} as ReviewState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <p className="text-center text-sm text-white/50">{businessName}</p>

        {state.ok ? (
          <div className="py-6 text-center">
            <p className="text-xl font-bold">{t.thanks}</p>
            {state.googleUrl && (
              <div className="mt-5">
                <p className="mb-3 text-sm text-white/60">{t.googleMsg}</p>
                <a
                  href={state.googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-xl px-5 font-bold text-black"
                  style={{ background: Y }}
                >
                  {t.googleBtn}
                </a>
              </div>
            )}
          </div>
        ) : (
          <form action={action} className="mt-4 space-y-4">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="rating" value={rating} />
            <h1 className="text-center text-2xl font-extrabold">{t.heading}</h1>
            <div className="flex justify-center gap-1.5 py-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const on = (hover || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    aria-label={`${n}`}
                    className="p-1"
                  >
                    <Star className="h-9 w-9" style={{ color: on ? Y : "transparent", fill: on ? Y : "transparent", stroke: on ? Y : "rgba(255,255,255,0.35)" }} />
                  </button>
                );
              })}
            </div>

            {rating > 0 && (
              <>
                <div>
                  <label className="mb-1 block text-xs text-white/60">{rating <= 3 ? t.low : t.high}</label>
                  <textarea name="comment" rows={3} className={inp} />
                </div>
                <input name="name" placeholder={t.namePh} className={inp} />
                <button type="submit" className="h-11 w-full rounded-xl font-bold text-black" style={{ background: Y }}>
                  {t.send}
                </button>
              </>
            )}
            {state.error && <p className="text-center text-sm text-red-400">{t.choose}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

const inp = "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/40";
