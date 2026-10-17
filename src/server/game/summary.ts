import type { Locale } from "@/i18n/routing";
import type { Category, Level, Question } from "@/lib/zod-schemas";

export type AnsweredRecord = {
  order: number;
  questionId: string;
  answer: boolean | null;
  isCorrect: boolean | null;
  points: number;
  timeMs: number | null;
};

export type ReviewItem = {
  order: number;
  questionId: string;
  level: Level;
  category: Category;
  statement: string;
  answer: boolean | null;
  correctAnswer: boolean;
  isCorrect: boolean;
  timedOut: boolean;
  points: number;
  explanation: string;
  docUrl: string;
};

export type CategoryResult = {
  category: Category;
  correct: number;
  total: number;
};

/** Builds the per-category stats and the full review for a finished game. */
export function buildReview(
  answers: readonly AnsweredRecord[],
  getQuestion: (id: string) => Question | undefined,
  locale: Locale,
): { review: ReviewItem[]; byCategory: CategoryResult[] } {
  const review = [...answers]
    .sort((a, b) => a.order - b.order)
    .map((a): ReviewItem => {
      const q = getQuestion(a.questionId);
      if (!q) throw new Error(`Unknown question ${a.questionId}`);
      return {
        order: a.order,
        questionId: q.id,
        level: q.level,
        category: q.category,
        statement: q.statement[locale],
        answer: a.answer,
        correctAnswer: q.answer,
        isCorrect: a.isCorrect === true,
        timedOut: a.answer === null,
        points: a.points,
        explanation: q.explanation[locale],
        docUrl: q.docUrl,
      };
    });

  const stats = new Map<Category, CategoryResult>();
  for (const item of review) {
    const entry = stats.get(item.category) ?? {
      category: item.category,
      correct: 0,
      total: 0,
    };
    entry.total++;
    if (item.isCorrect) entry.correct++;
    stats.set(item.category, entry);
  }

  return { review, byCategory: [...stats.values()] };
}
