import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "./dict";
import { translate, type TFunc } from "./index";

// Current locale from the cookie (server components / actions). Default: Albanian.
export function getLocale(): Locale {
  try {
    return cookies().get(LOCALE_COOKIE)?.value === "en" ? "en" : "sq";
  } catch {
    return "sq";
  }
}

// Translator for server components.
export function getT(): TFunc {
  const locale = getLocale();
  return (key, vars) => translate(locale, key, vars);
}
