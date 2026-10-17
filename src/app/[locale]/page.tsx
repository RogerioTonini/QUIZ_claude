import type { Metadata } from "next";
import { locale } from "next/root-params";
import { useTranslations } from "next-intl";
import { LevelPicker, type LevelOption } from "@/components/game/LevelPicker";
import { Link } from "@/i18n/navigation";
import { alternates } from "@/lib/seo";
import { BASE_POINTS } from "@/server/game/scoring";

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: alternates(await locale()) };
}

const OPTIONS: LevelOption[] = [
  { level: "beginner", basePoints: BASE_POINTS.beginner },
  { level: "intermediate", basePoints: BASE_POINTS.intermediate },
  { level: "advanced", basePoints: BASE_POINTS.advanced },
  { level: "mixed", basePoints: null },
];

export default function HomePage() {
  const t = useTranslations("Home");

  return (
    <div className="space-y-10">
      <section className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-lg text-muted">{t("subtitle")}</p>
      </section>
      <LevelPicker options={OPTIONS} />
      <p className="flex flex-wrap justify-center gap-x-6 gap-y-2">
        <Link
          href="/leaderboard"
          className="text-accent underline underline-offset-2"
        >
          {t("leaderboard")}
        </Link>
        <Link
          href="/how-it-works"
          className="text-accent underline underline-offset-2"
        >
          {t("howItWorks")}
        </Link>
      </p>
    </div>
  );
}
