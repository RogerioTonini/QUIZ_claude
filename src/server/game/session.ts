import type { Level } from "@/lib/zod-schemas";
import { scoreAnswer, TIME_LIMIT_MS, type ScoreResult } from "./scoring";

/** In-progress games with no activity for this long are expired lazily (D06). */
export const IDLE_EXPIRY_MS = 2 * 60 * 60 * 1000;

export type GameStatus = "IN_PROGRESS" | "FINISHED" | "EXPIRED";

export type GameState = {
  status: GameStatus;
  questionIds: string[];
  currentIndex: number;
  score: number;
  correctCount: number;
  streak: number;
  bestStreak: number;
  totalTimeMs: number;
};

export type AnswerTimes = { servedAt: Date; answeredAt: Date | null };

export function currentQuestionId(state: GameState): string | undefined {
  return state.status === "IN_PROGRESS"
    ? state.questionIds[state.currentIndex]
    : undefined;
}

export function lastActivityAt(
  startedAt: Date,
  answers: readonly AnswerTimes[],
): Date {
  let latest = startedAt.getTime();
  for (const a of answers) {
    latest = Math.max(
      latest,
      a.servedAt.getTime(),
      a.answeredAt?.getTime() ?? 0,
    );
  }
  return new Date(latest);
}

export function shouldExpire(
  status: GameStatus,
  lastActivity: Date,
  now: Date,
): boolean {
  return (
    status === "IN_PROGRESS" &&
    now.getTime() - lastActivity.getTime() > IDLE_EXPIRY_MS
  );
}

export type AnswerInput = {
  level: Level;
  answer: boolean | null;
  correctAnswer: boolean;
  elapsedMs: number;
};

export type AppliedAnswer = {
  result: ScoreResult;
  /** Time charged to the game; capped at the time limit so slow timeouts don't dominate (D16). */
  timeMs: number;
  next: GameState;
  finished: boolean;
};

/** Scores the answer to the current question and advances the game. */
export function applyAnswer(
  state: GameState,
  input: AnswerInput,
): AppliedAnswer {
  if (state.status !== "IN_PROGRESS")
    throw new Error(`Game is ${state.status}`);

  const result = scoreAnswer({ ...input, streak: state.streak });
  const timeMs = Math.min(Math.max(0, input.elapsedMs), TIME_LIMIT_MS);
  const currentIndex = state.currentIndex + 1;
  const finished = currentIndex >= state.questionIds.length;

  return {
    result,
    timeMs,
    finished,
    next: {
      ...state,
      status: finished ? "FINISHED" : "IN_PROGRESS",
      currentIndex,
      score: state.score + result.points,
      correctCount: state.correctCount + (result.isCorrect ? 1 : 0),
      streak: result.newStreak,
      bestStreak: Math.max(state.bestStreak, result.newStreak),
      totalTimeMs: state.totalTimeMs + timeMs,
    },
  };
}
