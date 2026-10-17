"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { track } from "@/lib/analytics";
import {
  type AnswerResult,
  fetchGame,
  GameApiError,
  type GameView,
  type QuestionView,
  sendAnswer,
} from "@/lib/game-api";
import { AnswerButtons } from "./AnswerButtons";
import { Feedback } from "./Feedback";
import { PlaySkeleton } from "./PlaySkeleton";
import { ScoreBar } from "./ScoreBar";
import { Timer } from "./Timer";

type Round = { view: GameView; question: QuestionView; deadline: number };

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "expired" }
  | { kind: "notFound" }
  | ({ kind: "question"; submitting: boolean } & Round)
  | ({ kind: "feedback"; result: AnswerResult } & Round);

const TYPING_TARGETS = "input, textarea, select, [contenteditable]";
const CONTROL_TARGETS = "button, a";

/**
 * Fetches the current question. The server owns the clock: a reload (or a locale switch, D04)
 * resumes the same question with whatever time is left. Resolves to null when the game is over.
 */
async function loadRound(
  gameId: string,
  locale: Locale,
): Promise<State | null> {
  try {
    const view = await fetchGame(gameId, locale);
    if (view.status === "FINISHED") return null;
    if (view.status === "EXPIRED" || !view.question) return { kind: "expired" };
    return {
      kind: "question",
      submitting: false,
      view,
      question: view.question,
      deadline: Date.now() + view.question.remainingMs,
    };
  } catch (e) {
    return {
      kind:
        e instanceof GameApiError && e.status === 404 ? "notFound" : "error",
    };
  }
}

export function PlayGame({ gameId }: { gameId: string }) {
  const t = useTranslations("Play");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(
    () =>
      loadRound(gameId, locale).then((next) => {
        if (next) setState(next);
        else router.replace(`/result/${gameId}`);
      }),
    [gameId, locale, router],
  );

  useEffect(() => {
    void load();
  }, [load]);

  function reload() {
    setState({ kind: "loading" });
    void load();
  }

  async function answer(value: boolean | null) {
    if (state.kind !== "question" || state.submitting) return;
    const round = state;
    setState({ ...round, submitting: true });
    try {
      const result = await sendAnswer(gameId, {
        questionId: round.question.id,
        answer: value,
        locale,
      });
      track("question_answered", {
        level: round.view.level,
        correct: result.isCorrect,
        timedOut: result.timedOut,
      });
      if (result.finished) {
        track("game_finished", {
          level: round.view.level,
          score: result.score,
          correct: result.correctCount,
        });
      }
      setState({
        kind: "feedback",
        result,
        view: { ...round.view, score: result.score, streak: result.streak },
        question: round.question,
        deadline: round.deadline,
      });
    } catch (e) {
      if (e instanceof GameApiError && e.code === "GAME_EXPIRED") {
        setState({ kind: "expired" });
      } else if (e instanceof GameApiError && e.status !== 0) {
        // Already answered elsewhere or out of sync: the server state wins.
        reload();
      } else {
        setState({ kind: "error" });
      }
    }
  }

  function next() {
    if (state.kind !== "feedback") return;
    if (state.result.finished) {
      router.push(`/result/${gameId}`);
    } else {
      reload();
    }
  }

  const trueKey = t("trueKey").toLowerCase();
  const falseKey = t("falseKey").toLowerCase();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(TYPING_TARGETS)) return;

      if (state.kind === "question") {
        const key = e.key.toLowerCase();
        if (key === trueKey) void answer(true);
        else if (key === falseKey) void answer(false);
      } else if (state.kind === "feedback" && e.key === "Enter") {
        // A focused button or link already handles Enter natively.
        if (target?.closest(CONTROL_TARGETS)) return;
        next();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (state.kind === "loading") return <PlaySkeleton />;

  if (state.kind === "error") {
    return (
      <div role="alert" className="space-y-4 text-center">
        <p>{t("networkError")}</p>
        <button
          type="button"
          onClick={reload}
          className="min-h-12 rounded-lg bg-accent px-6 font-semibold text-accent-foreground"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  if (state.kind === "expired" || state.kind === "notFound") {
    const expired = state.kind === "expired";
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">
          {expired ? t("expiredTitle") : t("notFoundTitle")}
        </h1>
        <p className="text-muted">
          {expired ? t("expiredText") : t("notFoundText")}
        </p>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-lg bg-accent px-6 font-semibold text-accent-foreground"
        >
          {t("newGame")}
        </Link>
      </div>
    );
  }

  const { view, question } = state;
  const outcome =
    state.kind === "feedback"
      ? state.result.timedOut
        ? t("timedOut")
        : state.result.isCorrect
          ? t("correct")
          : t("incorrect")
      : "";

  return (
    <div className="space-y-6">
      <ScoreBar
        question={question}
        total={view.total}
        score={view.score}
        streak={view.streak}
      />
      {state.kind === "question" && (
        <Timer
          key={question.id}
          deadline={state.deadline}
          onExpire={() => void answer(null)}
        />
      )}
      <h1 className="text-xl leading-relaxed font-semibold sm:text-2xl">
        {question.statement}
      </h1>
      {state.kind === "question" ? (
        <AnswerButtons
          disabled={state.submitting}
          onAnswer={(value) => void answer(value)}
        />
      ) : (
        <Feedback
          result={state.result}
          questionId={question.id}
          onNext={next}
        />
      )}
      <p aria-live="polite" className="sr-only">
        {outcome}
      </p>
    </div>
  );
}
