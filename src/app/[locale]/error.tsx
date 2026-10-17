"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Unexpected error inside a page; the layout (header, language switcher) stays usable. */
export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const t = useTranslations("ErrorPage");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="space-y-4 text-center">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted">{t("text")}</p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 font-semibold text-accent-foreground hover:opacity-90"
        >
          {t("retry")}
        </button>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border px-6 font-semibold hover:bg-surface"
        >
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
