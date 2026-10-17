import "server-only";
import rawBank from "@/content/questions.json";
import type { Locale } from "@/i18n/routing";
import {
  QuestionBankSchema,
  type Category,
  type Level,
  type Question,
} from "@/lib/zod-schemas";

/** What the client may see before answering: never `answer`, `explanation` or `docUrl`. */
export type PublicQuestion = {
  id: string;
  level: Level;
  category: Category;
  statement: string;
};

// Parsed once per server process; an invalid bank fails loudly at startup.
const bank = QuestionBankSchema.parse(rawBank);
const byId = new Map(bank.questions.map((q) => [q.id, q]));

export function getAllQuestions(): readonly Question[] {
  return bank.questions;
}

export function getQuestion(id: string): Question | undefined {
  return byId.get(id);
}

export function getQuestionsByLevel(level: Level): Question[] {
  return bank.questions.filter((q) => q.level === level);
}

export function toPublicQuestion(q: Question, locale: Locale): PublicQuestion {
  return {
    id: q.id,
    level: q.level,
    category: q.category,
    statement: q.statement[locale],
  };
}
