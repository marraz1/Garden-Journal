import { routing } from "./routing";

/**
 * Adds the locale prefix the way `localePrefix: "as-needed"` expects: the
 * default locale stays unprefixed, every other locale gets `/<locale>`.
 *
 * Needed where next-intl's Link/redirect helpers are not available — most
 * notably the `redirectTo` handed to Auth.js after an OAuth round trip.
 */
export function localizedPath(locale: string, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === routing.defaultLocale) return clean;
  return `/${locale}${clean === "/" ? "" : clean}` || "/";
}
