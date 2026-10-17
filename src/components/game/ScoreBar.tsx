"use client";

import { useTranslations } from "next-intl";
import type { QuestionView } from "@/lib/game-api";

export function ScoreBar({
  question,
  total,
  score,
  streak,
}: {
  question: QuestionView;
  total: number;
  score: number;
  streak: number;
}) {
  const t = useTranslations();

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
      <p>
        <span className="font-semibold">
          {t("Play.progress", { current: question.order + 1, total })}
        </span>
        <span className="text-muted">
          {" · "}
          {t(`Levels.${question.level}.name`)} ·{" "}
          {t(`Categories.${question.category}`)}
        </span>
      </p>
      <p className="flex gap-4">
        <span>
          {t("Play.score")}:{" "}
          <span data-testid="score" className="font-semibold tabular-nums">
            {score}
          </span>
        </span>
        <span>
          {t("Play.streak")}:{" "}
          <span className="font-semibold tabular-nums">{streak}</span>
        </span>
      </p>
    </div>
  );
}
