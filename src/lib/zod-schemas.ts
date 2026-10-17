import { z } from "zod";
import { routing } from "@/i18n/routing";

export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type Level = (typeof LEVELS)[number];

/** Levels a player can pick: the three question levels plus Mixed. */
export const GAME_LEVELS = [...LEVELS, "mixed"] as const;
export type GameLevel = (typeof GAME_LEVELS)[number];

export const CATEGORIES = [
  "fundamentals",
  "business",
  "workflow",
  "commands",
  "config",
  "extensibility",
  "security",
  "automation",
] as const;
export type Category = (typeof CATEGORIES)[number];

const LocalizedText = z.object({
  "pt-BR": z.string().trim().min(1),
  en: z.string().trim().min(1),
  de: z.string().trim().min(1),
});

export const QuestionSchema = z.object({
  id: z.string().regex(/^[BIA]\d{2}$/),
  level: z.enum(LEVELS),
  category: z.enum(CATEGORIES),
  answer: z.boolean(),
  docUrl: z.url({ protocol: /^https$/ }),
  statement: LocalizedText,
  explanation: LocalizedText,
});
export type Question = z.infer<typeof QuestionSchema>;

export const QuestionBankSchema = z.object({
  version: z.literal(1),
  questions: z.array(QuestionSchema).min(1),
});
export type QuestionBank = z.infer<typeof QuestionBankSchema>;

// API inputs (PRD §6.5)

export const LocaleSchema = z.enum(routing.locales);

export const CreateGameInput = z.object({
  level: z.enum(GAME_LEVELS),
  locale: LocaleSchema,
});

export const AnswerInput = z.object({
  questionId: z.string().min(1),
  answer: z.boolean().nullable(),
  locale: LocaleSchema,
});

/** Optional `?locale=`; absent means the game's own locale. */
export const LocaleQuery = LocaleSchema.optional();
