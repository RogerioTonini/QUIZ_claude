import { Suspense } from "react";
import type { Metadata } from "next";
import { locale } from "next/root-params";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { Link } from "@/i18n/navigation";
import {
  GAME_LEVELS,
  type GameLevel,
  PERIODS,
  type Period,
} from "@/lib/zod-schemas";
import { alternates } from "@/lib/seo";
import { getLeaderboard } from "@/server/leaderboard";

type Props = PageProps<"/[locale]/leaderboard">;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Leaderboard");
  return {
    title: t("title"),
    alternates: alternates(await locale(), "/leaderboard"),
  };
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const t = await getTranslations("Leaderboard");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-lg bg-surface" />}
      >
        <LeaderboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function pick<T extends string>(
  value: string | string[] | undefined,
  options: readonly T[],
  fallback: T,
): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

async function LeaderboardContent({
  searchParams,
}: Pick<Props, "searchParams">) {
  await connection();
  const params = await searchParams;
  const level: GameLevel = pick(params.level, GAME_LEVELS, "beginner");
  const period: Period = pick(params.period, PERIODS, "week");

  const t = await getTranslations();
  const rows = await getLeaderboard({ level, period, limit: 50 });

  const tab = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-lg px-4 font-medium ${
      active
        ? "bg-accent text-accent-foreground"
        : "border border-border hover:bg-surface"
    }`;

  return (
    <div className="space-y-6">
      <nav aria-label={t("Leaderboard.levels")}>
        <ul className="flex flex-wrap gap-2">
          {GAME_LEVELS.map((l) => (
            <li key={l}>
              <Link
                href={{ pathname: "/leaderboard", query: { level: l, period } }}
                aria-current={l === level ? "page" : undefined}
                className={tab(l === level)}
              >
                {t(`Levels.${l}.name`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <nav aria-label={t("Leaderboard.period")}>
        <ul className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <li key={p}>
              <Link
                href={{ pathname: "/leaderboard", query: { level, period: p } }}
                aria-current={p === period ? "page" : undefined}
                className={tab(p === period)}
              >
                {t(`Leaderboard.${p}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {rows.length > 0 ? (
        <LeaderboardTable
          rows={rows}
          caption={`${t(`Levels.${level}.name`)} · ${t(`Leaderboard.${period}`)}`}
        />
      ) : (
        <div className="space-y-4 rounded-lg border border-border bg-surface p-6 text-center">
          <p>{t("Leaderboard.empty")}</p>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center rounded-lg bg-accent px-6 font-semibold text-accent-foreground hover:opacity-90"
          >
            {t("Leaderboard.play")}
          </Link>
        </div>
      )}
    </div>
  );
}
