import { describe, expect, it } from "vitest";
import rawBank from "@/content/questions.json";
import { routing } from "@/i18n/routing";
import { LEVELS, QuestionBankSchema } from "@/lib/zod-schemas";
import {
  getAllQuestions,
  getQuestion,
  getQuestionsByLevel,
  toPublicQuestion,
} from "@/server/content";

const EXPLANATION_PREFIX = {
  "pt-BR": { true: "Verdadeiro.", false: "Falso." },
  en: { true: "True.", false: "False." },
  de: { true: "Wahr.", false: "Falsch." },
} as const;

const ID_PREFIX = { beginner: "B", intermediate: "I", advanced: "A" } as const;

const questions = getAllQuestions();

describe("question bank", () => {
  it("matches the schema", () => {
    expect(QuestionBankSchema.safeParse(rawBank).error).toBeUndefined();
  });

  it("has unique ids", () => {
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(LEVELS)(
    "has exactly 10 %s questions with matching id prefix",
    (level) => {
      const ofLevel = getQuestionsByLevel(level);
      expect(ofLevel).toHaveLength(10);
      for (const q of ofLevel)
        expect(q.id.startsWith(ID_PREFIX[level])).toBe(true);
    },
  );

  it.each(routing.locales)(
    "explanation prefix matches the answer in %s",
    (locale) => {
      for (const q of questions) {
        const expected = EXPLANATION_PREFIX[locale][`${q.answer}`];
        expect(q.explanation[locale], `${q.id} (${locale})`).toMatch(
          new RegExp(`^${expected.replace(".", "\\.")} `),
        );
      }
    },
  );

  it.each(LEVELS)("keeps the true/false balance of %s near 60/40", (level) => {
    const ofLevel = getQuestionsByLevel(level);
    const trueShare = ofLevel.filter((q) => q.answer).length / ofLevel.length;
    // Advisory only (PRD §5.1): warn instead of failing.
    if (trueShare < 0.5 || trueShare > 0.7) {
      console.warn(
        `${level}: ${Math.round(trueShare * 100)}% true answers (target ~60%)`,
      );
    }
    expect(trueShare).toBeGreaterThan(0);
    expect(trueShare).toBeLessThan(1);
  });
});

describe("content access", () => {
  it("finds questions by id", () => {
    expect(getQuestion("B01")?.level).toBe("beginner");
    expect(getQuestion("Z99")).toBeUndefined();
  });

  it("strips answer, explanation and docUrl from the public question", () => {
    const q = getQuestion("A06")!;
    const pub = toPublicQuestion(q, "de");
    expect(Object.keys(pub).sort()).toEqual([
      "category",
      "id",
      "level",
      "statement",
    ]);
    expect(pub.statement).toBe(q.statement.de);
    expect(JSON.stringify(pub)).not.toContain(q.explanation.de);
  });
});
