import { LOCALES, type Locale } from "./types";

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(v: string | undefined | null): v is Locale {
  if (!v) return false;
  return (LOCALES as readonly string[]).includes(v);
}

/** FE: Extract locale from pathname like "/en/admin". */
export function localeFromPathname(pathname: string): Locale {
  const m = pathname.match(/^\/(en|ru|el)(?:\/|$)/);
  return (m?.[1] as Locale) ?? DEFAULT_LOCALE;
}

/** FE: Replace current locale segment with a new one, preserving the rest of the path. */
export function swapLocaleInPathname(pathname: string, next: Locale): string {
  const has = pathname.match(/^\/(en|ru|el)(?:\/|$)/);
  if (!has) return `/${next}${pathname.startsWith("/") ? "" : "/"}${pathname}`;
  return pathname.replace(/^\/(en|ru|el)(?=\/|$)/, `/${next}`);
}
