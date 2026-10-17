import { describe, expect, it } from "vitest";
import { LEVELS, type Level } from "@/lib/zod-schemas";
import { drawQuestions, shuffle, type Rng } from "@/server/game/draw";
import { getAllQuestions, getQuestion } from "@/server/content";

/** Deterministic LCG so failures are reproducible. */
function seeded(seed: number): Rng {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

const pool = getAllQuestions();
const levelOf = (id: string) => getQuestion(id)!.level;

describe("drawQuestions", () => {
  it.each(LEVELS)("draws 10 distinct %s questions", (level) => {
    const ids = drawQuestions(level, pool, seeded(1));
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
    expect(ids.every((id) => levelOf(id) === level)).toBe(true);
  });

  it("draws 3/4/3 without repeats for mixed games", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const ids = drawQuestions("mixed", pool, seeded(seed));
      expect(ids).toHaveLength(10);
      expect(new Set(ids).size).toBe(10);
      const counts: Record<Level, number> = {
        beginner: 0,
        intermediate: 0,
        advanced: 0,
      };
      for (const id of ids) counts[levelOf(id)]++;
      expect(counts).toEqual({ beginner: 3, intermediate: 4, advanced: 3 });
    }
  });

  it("shuffles levels together in mixed games", () => {
    const orders = new Set(
      Array.from({ length: 20 }, (_, i) =>
        drawQuestions("mixed", pool, seeded(i + 1))
          .map(levelOf)
          .join(),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("throws when a level has too few questions", () => {
    const small = pool.filter((q) => q.level !== "advanced" || q.id < "A05");
    expect(() => drawQuestions("advanced", small)).toThrow(/advanced/);
  });
});

describe("shuffle", () => {
  it("keeps the same items and does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input, seeded(7));
    expect([...result].sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});
