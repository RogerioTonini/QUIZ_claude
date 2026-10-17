import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Localized 404 for notFound() calls and unknown paths under a locale ([...rest]). */
export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted">{t("text")}</p>
      <Link
        href="/"
        className="inline-flex min-h-12 items-center rounded-lg bg-accent px-6 font-semibold text-accent-foreground hover:opacity-90"
      >
        {t("home")}
      </Link>
    </div>
  );
}
