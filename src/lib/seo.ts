import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

// On Vercel, previews fall back to the production domain, so canonicals never point at a preview.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

/** Canonical URL and hreflang links of a page, given its path without the locale prefix. */
export function alternates(
  locale: string,
  path = "",
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])),
      "x-default": `/${routing.defaultLocale}${path}`,
    },
  };
}

/** Per-game pages are private to the player: keep them out of search results. */
export const noIndex: Metadata["robots"] = { index: false, follow: false };
