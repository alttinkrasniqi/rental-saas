import { SQ, type Locale } from "./dict";

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  let s = locale === "sq" ? SQ[key] ?? key : key;
  if (vars) {
    for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  }
  return s;
}

export { type Locale } from "./dict";
