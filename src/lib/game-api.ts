// Shapes of the game API (PRD §6.5) and a small fetch client. Safe for client components:
// it never imports src/server, which implements these types.
import type { Locale } from "@/i18n/routing";
import type { ApiErrorCode } from "@/lib/api";
import type { Category, GameLevel, Level } from "@/lib/zod-schemas";

export type GameStatus = "IN_PROGRESS" | "FINISHED" | "EXPIRED";

export type QuestionView = {
  id: string;
  order: number;
  level: Level;
  category: Category;
  statement: string;
  remainingMs: number;
};

export type GameView = {
  status: GameStatus;
  index: number;
  total: number;
  score: number;
  streak: number;
  question?: QuestionView;
};

export type Breakdown = {
  base: number;
  timeBonus: number;
  streakBonus: number;
};

export type AnswerResult = {
  isCorrect: boolean;
  correctAnswer: boolean;
  explanation: string;
  docUrl: string;
  points: number;
  breakdown: Breakdown;
  score: number;
  streak: number;
  finished: boolean;
  timedOut: boolean;
};

export type CreatedGame = {
  gameId: string;
  total: number;
  timePerQuestionSec: number;
};

export type SubmittedEntry = {
  entryId: string;
  /** Position on the level's all-time board. */
  rank: number;
};

export type LeaderboardRow = {
  id: string;
  rank: number;
  nickname: string;
  score: number;
  correctCount: number;
  totalTimeMs: number;
  createdAt: string;
};

/** Failed API call; `code` is the PRD error code, or "NETWORK" when no response arrived. */
export class GameApiError extends Error {
  constructor(
    readonly code: ApiErrorCode | "NETWORK" | "UNKNOWN",
    readonly status: number,
  ) {
    super(code);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: init?.body ? { "content-type": "application/json" } : undefined,
    });
  } catch {
    throw new GameApiError("NETWORK", 0);
  }
  if (res.ok) return res.json() as Promise<T>;
  const body = (await res.json().catch(() => null)) as {
    error?: { code?: ApiErrorCode };
  } | null;
  throw new GameApiError(body?.error?.code ?? "UNKNOWN", res.status);
}

export function createGame(level: GameLevel, locale: Locale) {
  return request<CreatedGame>("/api/games", {
    method: "POST",
    body: JSON.stringify({ level, locale }),
  });
}

export function fetchGame(gameId: string, locale: Locale) {
  return request<GameView>(
    `/api/games/${encodeURIComponent(gameId)}?locale=${locale}`,
  );
}

export function sendAnswer(
  gameId: string,
  body: { questionId: string; answer: boolean | null; locale: Locale },
) {
  return request<AnswerResult>(
    `/api/games/${encodeURIComponent(gameId)}/answer`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export function submitLeaderboardEntry(gameId: string, nickname: string) {
  return request<SubmittedEntry>("/api/leaderboard", {
    method: "POST",
    body: JSON.stringify({ gameId, nickname }),
  });
}
