import type { Level } from "@/lib/zod-schemas";

/** PRD §4. */
export const BASE_POINTS: Record<Level, number> = {
  beginner: 100,
  intermediate: 150,
  advanced: 200,
};

export const TIME_LIMIT_MS = 30_000;
/** Network latency allowance; only decides whether the answer timed out (D03). */
export const LATENCY_TOLERANCE_MS = 2_000;

/** Streak bonus steps of 10% of base, from the 3rd consecutive correct answer, capped at +50%. */
const MAX_STREAK_STEPS = 5;

export type Breakdown = {
  base: number;
  timeBonus: number;
  streakBonus: number;
};

export type ScoreInput = {
  level: Level;
  /** The player's answer; null means the client reported a timeout. */
  answer: boolean | null;
  correctAnswer: boolean;
  /** Server-measured time between serving and answering the question. */
  elapsedMs: number;
  /** Consecutive correct answers before this one. */
  streak: number;
};

export type ScoreResult = {
  isCorrect: boolean;
  timedOut: boolean;
  points: number;
  breakdown: Breakdown;
  newStreak: number;
};

export function isTimeout(elapsedMs: number): boolean {
  return elapsedMs > TIME_LIMIT_MS + LATENCY_TOLERANCE_MS;
}

export function remainingMs(elapsedMs: number): number {
  return Math.max(0, TIME_LIMIT_MS - elapsedMs);
}

export function scoreAnswer(input: ScoreInput): ScoreResult {
  const timedOut = input.answer === null || isTimeout(input.elapsedMs);
  const isCorrect = !timedOut && input.answer === input.correctAnswer;

  if (!isCorrect) {
    return {
      isCorrect,
      timedOut,
      points: 0,
      breakdown: { base: 0, timeBonus: 0, streakBonus: 0 },
      newStreak: 0,
    };
  }

  const base = BASE_POINTS[input.level];
  const newStreak = input.streak + 1;
  // Within the tolerance window the remaining time is 0, so the bonus is never negative (D03).
  const timeBonus = Math.floor(
    (base * 0.5 * remainingMs(input.elapsedMs)) / TIME_LIMIT_MS,
  );
  const streakSteps = Math.min(Math.max(0, newStreak - 2), MAX_STREAK_STEPS);
  const streakBonus = Math.floor((base * streakSteps) / 10);

  return {
    isCorrect,
    timedOut,
    points: base + timeBonus + streakBonus,
    breakdown: { base, timeBonus, streakBonus },
    newStreak,
  };
}

/** Highest possible score for a game with these question levels (all correct, answered instantly). */
export function maxScore(levels: readonly Level[]): number {
  let total = 0;
  let streak = 0;
  for (const level of levels) {
    const result = scoreAnswer({
      level,
      answer: true,
      correctAnswer: true,
      elapsedMs: 0,
      streak,
    });
    total += result.points;
    streak = result.newStreak;
  }
  return total;
}
