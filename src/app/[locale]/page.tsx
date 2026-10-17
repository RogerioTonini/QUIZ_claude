import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("Home");

  return (
    <section className="space-y-3 text-center">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="text-lg text-muted">{t("subtitle")}</p>
    </section>
  );
}
