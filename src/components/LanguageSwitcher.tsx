"use client";

import { Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { track } from "@/lib/analytics";

const SHORT_LABEL = { "pt-BR": "PT", en: "EN", de: "DE" } as const;

// On dynamic routes (e.g. /play/[gameId]) the pathname is only known at request time, so the
// prerendered shell links to each locale's home until the real pathname streams in.
export function LanguageSwitcher() {
  return (
    <Suspense fallback={<LanguageLinks pathname="/" />}>
      <CurrentPathLanguageLinks />
    </Suspense>
  );
}

function CurrentPathLanguageLinks() {
  return <LanguageLinks pathname={usePathname()} />;
}

function LanguageLinks({ pathname }: { pathname: string }) {
  const t = useTranslations("LanguageSwitcher");
  const current = useLocale();

  return (
    <nav aria-label={t("label")}>
      <ul className="flex items-center gap-1 text-sm font-medium">
        {routing.locales.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <Link
                href={pathname}
                locale={locale}
                hrefLang={locale}
                lang={locale}
                aria-current={active ? "true" : undefined}
                onClick={() => {
                  if (!active)
                    track("locale_changed", { from: current, to: locale });
                }}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                {SHORT_LABEL[locale]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
