"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { AnswerResult } from "@/lib/game-api";

/** Outcome of one answer (RF04): icon, color and text, explanation, doc link and points. */
export function Feedback({
  result,
  onNext,
}: {
  result: AnswerResult;
  onNext: () => void;
}) {
  const t = useTranslations();
  const nextRef = useRef<HTMLButtonElement>(null);

  // Focus "Next" so Enter (and screen readers) continue from the feedback.
  useEffect(() => {
    nextRef.current?.focus();
  }, []);

  const outcome = result.timedOut
    ? { icon: "⏱", text: t("Play.timedOut"), color: "text-danger" }
    : result.isCorrect
      ? { icon: "✓", text: t("Play.correct"), color: "text-success" }
      : { icon: "✗", text: t("Play.incorrect"), color: "text-danger" };
  const { base, timeBonus, streakBonus } = result.breakdown;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <h2
        className={`flex items-center gap-2 text-xl font-bold ${outcome.color}`}
      >
        <span aria-hidden="true">{outcome.icon}</span>
        {outcome.text}
      </h2>
      <p className="font-medium">
        {t("Play.correctAnswer", {
          answer: result.correctAnswer ? t("Answer.true") : t("Answer.false"),
        })}
      </p>
      <p>{result.explanation}</p>
      <p className="text-sm">
        <span className="font-semibold">
          {t("Play.pointsEarned", { points: result.points })}
        </span>
        {result.points > 0 && (
          <span className="text-muted">
            {" "}
            ({t("Play.breakdown", { base, timeBonus, streakBonus })})
          </span>
        )}
      </p>
      <p>
        <a
          href={result.docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-2"
        >
          {t("Play.learnMore")}
          <span className="sr-only"> {t("Play.newTab")}</span>
          <span aria-hidden="true"> ↗</span>
        </a>
      </p>
      <button
        ref={nextRef}
        type="button"
        onClick={onNext}
        className="min-h-12 w-full rounded-lg bg-accent px-6 font-semibold text-accent-foreground hover:opacity-90 sm:w-auto"
      >
        {result.finished ? t("Play.seeResult") : t("Play.next")}
      </button>
    </section>
  );
}
