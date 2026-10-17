import "server-only";
import type { Level as DbLevel } from "@/generated/prisma/enums";
import type { Locale } from "@/i18n/routing";
import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import type { AnswerResult, CreatedGame, GameView } from "@/lib/game-api";
import type { GameLevel } from "@/lib/zod-schemas";
import {
  getAllQuestions,
  getQuestion,
  toPublicQuestion,
} from "@/server/content";
import { drawQuestions, QUESTIONS_PER_GAME } from "@/server/game/draw";
import { remainingMs, TIME_LIMIT_MS } from "@/server/game/scoring";
import {
  applyAnswer,
  currentQuestionId,
  lastActivityAt,
  shouldExpire,
} from "@/server/game/session";
import {
  buildReview,
  type CategoryResult,
  type ReviewItem,
} from "@/server/game/summary";

export function toDbLevel(level: GameLevel): DbLevel {
  return level.toUpperCase() as DbLevel;
}

export function fromDbLevel(level: DbLevel): GameLevel {
  return level.toLowerCase() as GameLevel;
}

function questionOrThrow(id: string) {
  const q = getQuestion(id);
  if (!q) throw new Error(`Game references unknown question ${id}`);
  return q;
}

/** Loads a game with its answers, expiring it first if it has been idle too long (D06). */
async function loadGame(id: string, now: Date) {
  const game = await db.gameSession.findUnique({
    where: { id },
    include: { answers: true },
  });
  if (!game) throw new ApiError("NOT_FOUND", "Game not found", 404);

  if (
    shouldExpire(game.status, lastActivityAt(game.startedAt, game.answers), now)
  ) {
    await db.gameSession.updateMany({
      where: { id, status: "IN_PROGRESS" },
      data: { status: "EXPIRED" },
    });
    game.status = "EXPIRED";
  }
  return game;
}

export async function createGame(input: {
  level: GameLevel;
  locale: Locale;
  ipHash: string;
}): Promise<CreatedGame> {
  const questionIds = drawQuestions(input.level, getAllQuestions());
  const game = await db.gameSession.create({
    data: {
      level: toDbLevel(input.level),
      locale: input.locale,
      questionIds,
      ipHash: input.ipHash,
    },
    select: { id: true },
  });
  return {
    gameId: game.id,
    total: QUESTIONS_PER_GAME,
    timePerQuestionSec: TIME_LIMIT_MS / 1000,
  };
}

/**
 * Current state of a game. Serves the current question (starting its server-side timer) the
 * first time it is requested; later calls return the same question with less time left.
 */
export async function getGameView(
  id: string,
  locale: Locale | undefined,
  now = new Date(),
): Promise<GameView> {
  const game = await loadGame(id, now);
  const view: GameView = {
    status: game.status,
    level: fromDbLevel(game.level),
    index: game.currentIndex,
    total: game.questionIds.length,
    score: game.score,
    streak: game.streak,
  };
  const questionId = currentQuestionId(game);
  if (!questionId) return view;

  const order = game.currentIndex;
  let served = game.answers.find((a) => a.order === order);
  if (!served) {
    // ON CONFLICT DO NOTHING: concurrent first loads keep the earliest servedAt.
    await db.gameAnswer.createMany({
      data: { gameId: id, questionId, order, servedAt: now },
      skipDuplicates: true,
    });
    served = await db.gameAnswer.findUniqueOrThrow({
      where: { gameId_order: { gameId: id, order } },
    });
  }

  const question = questionOrThrow(questionId);
  view.question = {
    ...toPublicQuestion(question, locale ?? (game.locale as Locale)),
    order,
    remainingMs: remainingMs(now.getTime() - served.servedAt.getTime()),
  };
  return view;
}

/** Scores the answer to the current question. Time is measured from the server's servedAt. */
export async function submitAnswer(
  id: string,
  input: { questionId: string; answer: boolean | null; locale: Locale },
  now = new Date(),
): Promise<AnswerResult> {
  const game = await loadGame(id, now);
  if (game.status === "EXPIRED")
    throw new ApiError("GAME_EXPIRED", "Game expired", 410);

  const previous = game.answers.find((a) => a.questionId === input.questionId);
  if (previous?.answeredAt) {
    throw new ApiError("ALREADY_ANSWERED", "Question already answered", 409);
  }
  if (game.status === "FINISHED")
    throw new ApiError("GAME_FINISHED", "Game finished", 409);
  if (input.questionId !== currentQuestionId(game)) {
    throw new ApiError("WRONG_QUESTION", "Not the current question", 400);
  }
  const served = game.answers.find((a) => a.order === game.currentIndex);
  if (!served)
    throw new ApiError("QUESTION_NOT_SERVED", "Question not served yet", 400);

  const question = questionOrThrow(input.questionId);
  const applied = applyAnswer(game, {
    level: question.level,
    answer: input.answer,
    correctAnswer: question.answer,
    elapsedMs: now.getTime() - served.servedAt.getTime(),
  });
  const { result, next } = applied;

  await db.$transaction(async (tx) => {
    // Conditional updates guard against two concurrent answers to the same question.
    const answerUpdate = await tx.gameAnswer.updateMany({
      where: { id: served.id, answeredAt: null },
      data: {
        answeredAt: now,
        answer: result.timedOut ? null : input.answer,
        isCorrect: result.isCorrect,
        timeMs: applied.timeMs,
        points: result.points,
      },
    });
    const sessionUpdate = await tx.gameSession.updateMany({
      where: { id, status: "IN_PROGRESS", currentIndex: game.currentIndex },
      data: {
        status: next.status,
        currentIndex: next.currentIndex,
        score: next.score,
        correctCount: next.correctCount,
        streak: next.streak,
        bestStreak: next.bestStreak,
        totalTimeMs: next.totalTimeMs,
        finishedAt: applied.finished ? now : null,
      },
    });
    if (answerUpdate.count === 0 || sessionUpdate.count === 0) {
      throw new ApiError("ALREADY_ANSWERED", "Question already answered", 409);
    }
  });

  return {
    isCorrect: result.isCorrect,
    correctAnswer: question.answer,
    explanation: question.explanation[input.locale],
    docUrl: question.docUrl,
    points: result.points,
    breakdown: result.breakdown,
    score: next.score,
    correctCount: next.correctCount,
    streak: next.streak,
    finished: applied.finished,
    timedOut: result.timedOut,
  };
}

export type GameSummary = {
  gameId: string;
  level: GameLevel;
  score: number;
  correctCount: number;
  total: number;
  totalTimeMs: number;
  bestStreak: number;
  finishedAt: string;
  byCategory: CategoryResult[];
  review: ReviewItem[];
};

export async function getSummary(
  id: string,
  locale: Locale | undefined,
  now = new Date(),
): Promise<GameSummary> {
  const game = await loadGame(id, now);
  if (game.status === "EXPIRED")
    throw new ApiError("GAME_EXPIRED", "Game expired", 410);
  if (game.status !== "FINISHED" || !game.finishedAt) {
    throw new ApiError("GAME_NOT_FINISHED", "Game not finished", 409);
  }

  const { review, byCategory } = buildReview(
    game.answers,
    getQuestion,
    locale ?? (game.locale as Locale),
  );
  return {
    gameId: game.id,
    level: fromDbLevel(game.level),
    score: game.score,
    correctCount: game.correctCount,
    total: game.questionIds.length,
    totalTimeMs: game.totalTimeMs,
    bestStreak: game.bestStreak,
    finishedAt: game.finishedAt.toISOString(),
    byCategory,
    review,
  };
}
