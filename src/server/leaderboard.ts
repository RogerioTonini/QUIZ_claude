import "server-only";
import type { Level as DbLevel } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import type { LeaderboardRow, SubmittedEntry } from "@/lib/game-api";
import type { GameLevel, Period } from "@/lib/zod-schemas";
import { toDbLevel } from "@/server/games";

/** A finished game may join the leaderboard for this long (PRD RF06). */
export const SUBMISSION_WINDOW_MS = 30 * 60 * 1000;
/** "Week" = the last 7 calendar days, rolling, in UTC (D05). */
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Tie-break (PRD RF07): score desc → correctCount desc → totalTimeMs asc → createdAt asc.
// The id makes the order total even for identical timestamps.
const ORDER = [
  { score: "desc" },
  { correctCount: "desc" },
  { totalTimeMs: "asc" },
  { createdAt: "asc" },
  { id: "asc" },
] as const;

type Ranked = {
  id: string;
  level: DbLevel;
  score: number;
  correctCount: number;
  totalTimeMs: number;
  createdAt: Date;
};

/** 1-based position on the level's all-time board (D29), in the same order as the listing. */
async function rankOf(entry: Ranked): Promise<number> {
  const { score, correctCount, totalTimeMs, createdAt, id } = entry;
  const ahead = await db.leaderboardEntry.count({
    where: {
      level: entry.level,
      OR: [
        { score: { gt: score } },
        { score, correctCount: { gt: correctCount } },
        { score, correctCount, totalTimeMs: { lt: totalTimeMs } },
        { score, correctCount, totalTimeMs, createdAt: { lt: createdAt } },
        { score, correctCount, totalTimeMs, createdAt, id: { lt: id } },
      ],
    },
  });
  return ahead + 1;
}

/** Whether a game finished at `finishedAt` can still be submitted at `now`. */
export function isSubmissionOpen(finishedAt: Date, now = new Date()): boolean {
  return now.getTime() - finishedAt.getTime() <= SUBMISSION_WINDOW_MS;
}

export async function submitEntry(
  input: { gameId: string; nickname: string },
  now = new Date(),
): Promise<SubmittedEntry> {
  const game = await db.gameSession.findUnique({
    where: { id: input.gameId },
    include: { leaderboard: { select: { id: true } } },
  });
  if (!game) throw new ApiError("NOT_FOUND", "Game not found", 404);
  if (game.leaderboard) {
    throw new ApiError(
      "ALREADY_SUBMITTED",
      "Game already on the leaderboard",
      409,
    );
  }
  if (game.status !== "FINISHED" || !game.finishedAt) {
    throw new ApiError("GAME_NOT_FINISHED", "Game not finished", 409);
  }
  if (!isSubmissionOpen(game.finishedAt, now)) {
    throw new ApiError("SUBMISSION_CLOSED", "Submission window closed", 410);
  }

  let entry: Ranked;
  try {
    entry = await db.leaderboardEntry.create({
      data: {
        gameId: game.id,
        nickname: input.nickname,
        level: game.level,
        score: game.score,
        correctCount: game.correctCount,
        totalTimeMs: game.totalTimeMs,
        createdAt: now,
      },
    });
  } catch (error) {
    // Unique gameId: a concurrent submission won the race.
    if ((error as { code?: string }).code === "P2002") {
      throw new ApiError(
        "ALREADY_SUBMITTED",
        "Game already on the leaderboard",
        409,
      );
    }
    throw error;
  }

  return { entryId: entry.id, rank: await rankOf(entry) };
}

/** The game's existing entry with its current rank, so the result page can show it again. */
export async function getEntryForGame(
  gameId: string,
): Promise<SubmittedEntry | null> {
  const entry = await db.leaderboardEntry.findUnique({ where: { gameId } });
  return entry && { entryId: entry.id, rank: await rankOf(entry) };
}

export async function getLeaderboard(
  query: { level: GameLevel; period: Period; limit: number },
  now = new Date(),
): Promise<LeaderboardRow[]> {
  const entries = await db.leaderboardEntry.findMany({
    where: {
      level: toDbLevel(query.level),
      ...(query.period === "week" && {
        createdAt: { gte: new Date(now.getTime() - WEEK_MS) },
      }),
    },
    orderBy: [...ORDER],
    take: query.limit,
    select: {
      id: true,
      nickname: true,
      score: true,
      correctCount: true,
      totalTimeMs: true,
      createdAt: true,
    },
  });
  return entries.map((e, index) => ({
    rank: index + 1,
    id: e.id,
    nickname: e.nickname,
    score: e.score,
    correctCount: e.correctCount,
    totalTimeMs: e.totalTimeMs,
    createdAt: e.createdAt.toISOString(),
  }));
}
