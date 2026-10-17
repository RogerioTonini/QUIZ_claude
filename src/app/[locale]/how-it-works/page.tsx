import type { Metadata } from "next";
import { locale } from "next/root-params";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { alternates } from "@/lib/seo";
import { QUESTIONS_PER_GAME } from "@/server/game/draw";
import { BASE_POINTS, maxScore, TIME_LIMIT_MS } from "@/server/game/scoring";

const MAX_SCORE = maxScore(Array(QUESTIONS_PER_GAME).fill("advanced"));

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("HowItWorks");
  return {
    title: t("title"),
    alternates: alternates(await locale(), "/how-it-works"),
  };
}

/** PRD RF09: rules, timer and scoring, with the theoretical maximum from scoring.ts. */
export default function HowItWorksPage() {
  const t = useTranslations();
  const seconds = TIME_LIMIT_MS / 1000;

  const sections = [
    {
      title: t("HowItWorks.rulesTitle"),
      items: [
        t("HowItWorks.rules.questions", {
          count: QUESTIONS_PER_GAME,
          seconds,
        }),
        t("HowItWorks.rules.levels"),
        t("HowItWorks.rules.timeout"),
        t("HowItWorks.rules.feedback"),
        t("HowItWorks.rules.keyboard", {
          trueKey: t("Play.trueKey"),
          falseKey: t("Play.falseKey"),
        }),
        t("HowItWorks.rules.serverClock"),
      ],
    },
    {
      title: t("HowItWorks.scoringTitle"),
      items: [
        t("HowItWorks.scoring.base", BASE_POINTS),
        t("HowItWorks.scoring.time"),
        t("HowItWorks.scoring.streak"),
        t("HowItWorks.scoring.wrong"),
      ],
    },
    {
      title: t("HowItWorks.leaderboardTitle"),
      items: [t("HowItWorks.leaderboard")],
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">{t("HowItWorks.title")}</h1>
      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <ul className="list-disc space-y-2 pl-6">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
      <p className="rounded-lg border border-border bg-surface p-4 font-medium">
        {t("HowItWorks.maxScore", { points: MAX_SCORE })}
      </p>
      <p className="text-muted">{t("Footer.disclaimer")}</p>
      <Link
        href="/"
        className="inline-flex min-h-12 items-center rounded-lg bg-accent px-6 font-semibold text-accent-foreground hover:opacity-90"
      >
        {t("HowItWorks.play")}
      </Link>
    </div>
  );
}
