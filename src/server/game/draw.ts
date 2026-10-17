import type { GameLevel, Level } from "@/lib/zod-schemas";

export const QUESTIONS_PER_GAME = 10;

/** Mixed games: 3 beginner / 4 intermediate / 3 advanced (PRD RF02). */
export const MIXED_DISTRIBUTION: Record<Level, number> = {
  beginner: 3,
  intermediate: 4,
  advanced: 3,
};

/** Returns a number in [0, 1), like Math.random. Injected so tests are deterministic. */
export type Rng = () => number;

type Drawable = { id: string; level: Level };

/** Fisher–Yates shuffle; returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function take(
  pool: readonly Drawable[],
  level: Level,
  count: number,
  rng: Rng,
) {
  const ofLevel = pool.filter((q) => q.level === level);
  if (ofLevel.length < count) {
    throw new Error(
      `Need ${count} ${level} questions, found ${ofLevel.length}`,
    );
  }
  return shuffle(ofLevel, rng).slice(0, count);
}

/** Draws the question ids for a new game, without repeats. */
export function drawQuestions(
  level: GameLevel,
  pool: readonly Drawable[],
  rng: Rng = Math.random,
): string[] {
  const drawn =
    level === "mixed"
      ? shuffle(
          (Object.keys(MIXED_DISTRIBUTION) as Level[]).flatMap((l) =>
            take(pool, l, MIXED_DISTRIBUTION[l], rng),
          ),
          rng,
        )
      : take(pool, level, QUESTIONS_PER_GAME, rng);
  return drawn.map((q) => q.id);
}
