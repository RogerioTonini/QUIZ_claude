import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getFormatter, getTranslations } from "next-intl/server";
import { ResultActions } from "@/components/game/ResultActions";
import { LeaderboardForm } from "@/components/leaderboard/LeaderboardForm";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ApiError } from "@/lib/api";
import { type GameSummary, getSummary } from "@/server/games";
import { noIndex } from "@/lib/seo";
import { getEntryForGame, isSubmissionOpen } from "@/server/leaderboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Result");
  return { title: t("title"), robots: noIndex };
}

export default function ResultPage({
  params,
}: PageProps<"/[locale]/result/[gameId]">) {
  return (
    <Suspense
      fallback={<div className="h-96 animate-pulse rounded-lg bg-surface" />}
    >
      <ResultContent params={params} />
    </Suspense>
  );
}

async function loadSummary(
  gameId: string,
  locale: Locale,
): Promise<GameSummary | ApiError> {
  try {
    return await getSummary(gameId, locale);
  } catch (e) {
    if (e instanceof ApiError) return e;
    throw e;
  }
}

/** PRD RF05 bands: 0–4, 5–7, 8–9, 10 correct answers. */
function band(correct: number, total: number) {
  if (correct === total) return "perfect";
  if (correct >= 8) return "great";
  if (correct >= 5) return "good";
  return "low";
}

async function ResultContent({
  params,
}: Pick<PageProps<"/[locale]/result/[gameId]">, "params">) {
  const { gameId, locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  await connection();

  const summary = await loadSummary(gameId, locale);
  if (summary instanceof ApiError) {
    if (summary.status === 404) notFound();
    // Not finished yet, or expired: the play page knows how to show both.
    return redirect({ href: `/play/${gameId}`, locale });
  }

  const t = await getTranslations();
  const format = await getFormatter();
  const yesNo = (value: boolean) =>
    value ? t("Answer.true") : t("Answer.false");

  const stats = [
    { label: t("Result.score"), value: format.number(summary.score) },
    {
      label: t("Result.correct"),
      value: t("Result.fraction", {
        correct: summary.correctCount,
        total: summary.total,
      }),
    },
    {
      label: t("Result.time"),
      value: format.number(summary.totalTimeMs / 1000, {
        style: "unit",
        unit: "second",
        maximumFractionDigits: 1,
      }),
    },
    { label: t("Result.bestStreak"), value: String(summary.bestStreak) },
  ];

  return (
    <div className="space-y-10">
      <section className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">{t("Result.title")}</h1>
        <p className="text-2xl font-semibold text-accent">
          {t(`Result.band.${band(summary.correctCount, summary.total)}`)}
        </p>
        <p className="text-muted">
          {t("Result.level", { level: t(`Levels.${summary.level}.name`) })}
        </p>
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border bg-surface p-4 text-center"
          >
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="text-2xl font-bold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <LeaderboardForm
        gameId={summary.gameId}
        level={summary.level}
        open={isSubmissionOpen(new Date(summary.finishedAt))}
        existing={await getEntryForGame(summary.gameId)}
      />

      <ResultActions level={summary.level} score={summary.score} />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("Result.byCategory")}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {summary.byCategory.map((c) => (
            <li
              key={c.category}
              className="flex justify-between rounded-md border border-border px-3 py-2"
            >
              <span>{t(`Categories.${c.category}`)}</span>
              <span className="font-semibold tabular-nums">
                {t("Result.fraction", { correct: c.correct, total: c.total })}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("Result.review")}</h2>
        <ol className="space-y-3">
          {summary.review.map((item) => (
            <li
              key={item.questionId}
              className="space-y-2 rounded-lg border border-border p-4"
            >
              <p className="flex gap-2 font-medium">
                <span
                  aria-hidden="true"
                  className={item.isCorrect ? "text-success" : "text-danger"}
                >
                  {item.timedOut ? "⏱" : item.isCorrect ? "✓" : "✗"}
                </span>
                <span>
                  {item.order + 1}. {item.statement}
                </span>
              </p>
              <p className="text-sm">
                <span
                  className={item.isCorrect ? "text-success" : "text-danger"}
                >
                  {item.isCorrect
                    ? t("Play.correct")
                    : item.timedOut
                      ? t("Play.timedOut")
                      : t("Play.incorrect")}
                </span>
                {" · "}
                {t("Result.yourAnswer", {
                  answer:
                    item.answer === null
                      ? t("Result.noAnswer")
                      : yesNo(item.answer),
                })}
                {" · "}
                {t("Play.correctAnswer", { answer: yesNo(item.correctAnswer) })}
                {" · "}
                {t("Play.pointsEarned", { points: item.points })}
              </p>
              <p className="text-sm text-muted">{item.explanation}</p>
              <a
                href={item.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent underline underline-offset-2"
              >
                {t("Play.learnMore")}
                <span className="sr-only"> {t("Play.newTab")}</span>
                <span aria-hidden="true"> ↗</span>
              </a>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
