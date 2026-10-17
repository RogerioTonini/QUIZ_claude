import { describe, expect, it } from "vitest";
import {
  isTimeout,
  maxScore,
  remainingMs,
  scoreAnswer,
  type ScoreInput,
} from "@/server/game/scoring";

const correct = (over: Partial<ScoreInput> = {}): ScoreInput => ({
  level: "beginner",
  answer: true,
  correctAnswer: true,
  elapsedMs: 30_000,
  streak: 0,
  ...over,
});

describe("isTimeout", () => {
  it("allows 2s of latency tolerance", () => {
    expect(isTimeout(30_000)).toBe(false);
    expect(isTimeout(32_000)).toBe(false);
    expect(isTimeout(32_001)).toBe(true);
  });
});

describe("remainingMs", () => {
  it("never goes negative", () => {
    expect(remainingMs(10_000)).toBe(20_000);
    expect(remainingMs(31_000)).toBe(0);
  });
});

describe("scoreAnswer", () => {
  it("uses the base points of the question level", () => {
    expect(scoreAnswer(correct({ level: "beginner" })).points).toBe(100);
    expect(scoreAnswer(correct({ level: "intermediate" })).points).toBe(150);
    expect(scoreAnswer(correct({ level: "advanced" })).points).toBe(200);
  });

  it("gives a time bonus of up to 50% of base", () => {
    expect(scoreAnswer(correct({ elapsedMs: 0 })).breakdown.timeBonus).toBe(50);
    expect(
      scoreAnswer(correct({ elapsedMs: 15_000 })).breakdown.timeBonus,
    ).toBe(25);
    // floor(150 * 0.5 * 20000 / 30000) = 50
    expect(
      scoreAnswer(correct({ level: "intermediate", elapsedMs: 10_000 }))
        .breakdown.timeBonus,
    ).toBe(50);
    // floor(100 * 0.5 * 1000 / 30000) = 1
    expect(
      scoreAnswer(correct({ elapsedMs: 29_000 })).breakdown.timeBonus,
    ).toBe(1);
  });

  it("gives no time bonus inside the tolerance window, but still scores (D03)", () => {
    const result = scoreAnswer(correct({ elapsedMs: 31_500 }));
    expect(result.isCorrect).toBe(true);
    expect(result.breakdown).toEqual({
      base: 100,
      timeBonus: 0,
      streakBonus: 0,
    });
  });

  it("starts the streak bonus at the 3rd consecutive correct answer", () => {
    expect(scoreAnswer(correct({ streak: 0 })).breakdown.streakBonus).toBe(0);
    expect(scoreAnswer(correct({ streak: 1 })).breakdown.streakBonus).toBe(0);
    expect(scoreAnswer(correct({ streak: 2 })).breakdown.streakBonus).toBe(10);
    expect(scoreAnswer(correct({ streak: 3 })).breakdown.streakBonus).toBe(20);
  });

  it("caps the streak bonus at +50% of base", () => {
    expect(scoreAnswer(correct({ streak: 6 })).breakdown.streakBonus).toBe(50);
    expect(scoreAnswer(correct({ streak: 20 })).breakdown.streakBonus).toBe(50);
    expect(
      scoreAnswer(correct({ level: "advanced", streak: 9 })).breakdown
        .streakBonus,
    ).toBe(100);
  });

  it("increments the streak on a correct answer", () => {
    expect(scoreAnswer(correct({ streak: 4 })).newStreak).toBe(5);
  });

  it("scores 0 and resets the streak on a wrong answer", () => {
    const result = scoreAnswer(
      correct({ answer: false, streak: 5, elapsedMs: 0 }),
    );
    expect(result).toMatchObject({
      isCorrect: false,
      timedOut: false,
      points: 0,
      newStreak: 0,
    });
  });

  it("treats a null answer as a timeout", () => {
    const result = scoreAnswer(
      correct({ answer: null, streak: 3, elapsedMs: 5_000 }),
    );
    expect(result).toMatchObject({
      isCorrect: false,
      timedOut: true,
      points: 0,
      newStreak: 0,
    });
  });

  it("treats a correct answer after 32s as a timeout", () => {
    const result = scoreAnswer(correct({ elapsedMs: 32_001, streak: 3 }));
    expect(result).toMatchObject({
      isCorrect: false,
      timedOut: true,
      points: 0,
      newStreak: 0,
    });
  });
});

describe("maxScore", () => {
  it("adds base, full time bonus and capped streak bonus", () => {
    // 10 advanced: base 200 + time 100 each = 3000, streak 0,0,20,40,60,80,100,100,100,100 = 600
    expect(maxScore(Array(10).fill("advanced"))).toBe(3600);
    expect(maxScore(Array(10).fill("beginner"))).toBe(1800);
  });
});
