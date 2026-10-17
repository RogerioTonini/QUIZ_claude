"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const SHORT_LABEL = { "pt-BR": "PT", en: "EN", de: "DE" } as const;

export function LanguageSwitcher() {
  const t = useTranslations("LanguageSwitcher");
  const current = useLocale();
  const pathname = usePathname();

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
