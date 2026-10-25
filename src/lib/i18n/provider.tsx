"use client";

import { createContext, useContext, useMemo } from "react";
import { translate, type TFunc } from "./index";
import type { Locale } from "./dict";

const Ctx = createContext<{ locale: Locale; t: TFunc }>({
  locale: "sq",
  t: (k) => k,
});

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(
    () => ({ locale, t: ((key, vars) => translate(locale, key, vars)) as TFunc }),
    [locale]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Translator for client components.
export function useT(): TFunc {
  return useContext(Ctx).t;
}

export function useLocale(): Locale {
  return useContext(Ctx).locale;
}
