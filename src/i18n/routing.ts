import { defineRouting } from "next-intl/routing";

export const locales = ["lt", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "lt",
  // Lithuanian stays unprefixed (/plan), English is prefixed (/en/plan).
  localePrefix: "as-needed",
});
