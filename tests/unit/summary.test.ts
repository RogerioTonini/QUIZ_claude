import { describe, expect, it } from "vitest";
import { getQuestion } from "@/server/content";
import { buildReview } from "@/server/game/summary";

describe("buildReview", () => {
  const answers = [
    {
      order: 1,
      questionId: "B02",
      answer: null,
      isCorrect: false,
      points: 0,
      timeMs: 30_000,
    },
    {
      order: 0,
      questionId: "B01",
      answer: true,
      isCorrect: true,
      points: 150,
      timeMs: 1_000,
    },
  ];

  it("orders the review and localizes it", () => {
    const { review } = buildReview(answers, getQuestion, "en");
    expect(review.map((r) => r.questionId)).toEqual(["B01", "B02"]);
    expect(review[0].statement).toBe(getQuestion("B01")!.statement.en);
    expect(review[1]).toMatchObject({ timedOut: true, isCorrect: false });
  });

  it("counts results per category", () => {
    const { byCategory } = buildReview(answers, getQuestion, "pt-BR");
    const total = byCategory.reduce((n, c) => n + c.total, 0);
    const correct = byCategory.reduce((n, c) => n + c.correct, 0);
    expect(total).toBe(2);
    expect(correct).toBe(1);
  });
});
