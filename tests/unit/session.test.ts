import { describe, expect, it } from "vitest";
import {
  applyAnswer,
  currentQuestionId,
  IDLE_EXPIRY_MS,
  lastActivityAt,
  shouldExpire,
  type GameState,
} from "@/server/game/session";

const ids = Array.from(
  { length: 10 },
  (_, i) => `B${String(i + 1).padStart(2, "0")}`,
);

const fresh = (over: Partial<GameState> = {}): GameState => ({
  status: "IN_PROGRESS",
  questionIds: ids,
  currentIndex: 0,
  score: 0,
  correctCount: 0,
  streak: 0,
  bestStreak: 0,
  totalTimeMs: 0,
  ...over,
});

const right = {
  level: "beginner",
  answer: true,
  correctAnswer: true,
  elapsedMs: 15_000,
} as const;
const wrong = { ...right, answer: false } as const;

describe("applyAnswer", () => {
  it("scores, advances the index and accumulates totals", () => {
    const { next, result, timeMs, finished } = applyAnswer(fresh(), right);
    expect(result.points).toBe(125);
    expect(timeMs).toBe(15_000);
    expect(finished).toBe(false);
    expect(next).toMatchObject({
      status: "IN_PROGRESS",
      currentIndex: 1,
      score: 125,
      correctCount: 1,
      streak: 1,
      bestStreak: 1,
      totalTimeMs: 15_000,
    });
  });

  it("keeps the best streak after a wrong answer", () => {
    const state = fresh({ currentIndex: 4, streak: 4, bestStreak: 4 });
    const { next } = applyAnswer(state, wrong);
    expect(next.streak).toBe(0);
    expect(next.bestStreak).toBe(4);
  });

  it("finishes the game on the 10th answer", () => {
    let state = fresh();
    for (let i = 0; i < 10; i++) {
      const applied = applyAnswer(state, right);
      expect(applied.finished).toBe(i === 9);
      state = applied.next;
    }
    expect(state.status).toBe("FINISHED");
    expect(state.correctCount).toBe(10);
    expect(state.bestStreak).toBe(10);
    expect(currentQuestionId(state)).toBeUndefined();
  });

  it("caps the time charged for a late timeout at 30s (D16)", () => {
    const { timeMs, result } = applyAnswer(fresh(), {
      ...right,
      elapsedMs: 120_000,
    });
    expect(result.timedOut).toBe(true);
    expect(timeMs).toBe(30_000);
  });

  it("refuses answers once the game is over", () => {
    expect(() => applyAnswer(fresh({ status: "FINISHED" }), right)).toThrow();
    expect(() => applyAnswer(fresh({ status: "EXPIRED" }), right)).toThrow();
  });
});

describe("currentQuestionId", () => {
  it("returns the question at the current index", () => {
    expect(currentQuestionId(fresh({ currentIndex: 3 }))).toBe("B04");
  });
});

describe("expiry", () => {
  const start = new Date("2026-01-01T10:00:00Z");

  it("uses the latest serve or answer time as last activity", () => {
    const answers = [
      {
        servedAt: new Date("2026-01-01T10:01:00Z"),
        answeredAt: new Date("2026-01-01T10:01:10Z"),
      },
      { servedAt: new Date("2026-01-01T10:01:11Z"), answeredAt: null },
    ];
    expect(lastActivityAt(start, answers)).toEqual(
      new Date("2026-01-01T10:01:11Z"),
    );
    expect(lastActivityAt(start, [])).toEqual(start);
  });

  it("expires in-progress games after 2h idle", () => {
    const justUnder = new Date(start.getTime() + IDLE_EXPIRY_MS);
    const justOver = new Date(start.getTime() + IDLE_EXPIRY_MS + 1);
    expect(shouldExpire("IN_PROGRESS", start, justUnder)).toBe(false);
    expect(shouldExpire("IN_PROGRESS", start, justOver)).toBe(true);
    expect(shouldExpire("FINISHED", start, justOver)).toBe(false);
  });
});
