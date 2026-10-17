import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Level } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import {
  getLeaderboard,
  nextIp,
  postEntry,
  resetDb,
  startGame,
} from "./helpers";

const MINUTE = 60_000;

/** A finished game, created directly so tests control score and timing. */
async function finishedGame(
  data: {
    level?: Level;
    score?: number;
    correctCount?: number;
    totalTimeMs?: number;
    finishedAgoMs?: number;
  } = {},
) {
  const game = await db.gameSession.create({
    data: {
      level: data.level ?? "BEGINNER",
      locale: "pt-BR",
      questionIds: [],
      currentIndex: 10,
      score: data.score ?? 1000,
      correctCount: data.correctCount ?? 8,
      totalTimeMs: data.totalTimeMs ?? 60_000,
      status: "FINISHED",
      ipHash: "test",
      finishedAt: new Date(Date.now() - (data.finishedAgoMs ?? 0)),
    },
  });
  return game.id;
}

/** A leaderboard entry with its own game, inserted directly. */
async function entry(
  nickname: string,
  data: {
    level?: Level;
    score: number;
    correctCount?: number;
    totalTimeMs?: number;
    createdAt?: Date;
  },
) {
  const gameId = await finishedGame(data);
  return db.leaderboardEntry.create({
    data: {
      gameId,
      nickname,
      level: data.level ?? "BEGINNER",
      score: data.score,
      correctCount: data.correctCount ?? 8,
      totalTimeMs: data.totalTimeMs ?? 60_000,
      createdAt: data.createdAt ?? new Date(),
    },
  });
}

async function errorCode(res: Response) {
  return ((await res.json()) as { error: { code: string } }).error.code;
}

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("POST /api/leaderboard", () => {
  it("registers a finished game, copying its result, and returns the rank", async () => {
    await entry("Top", { score: 2000 });
    await entry("Low", { score: 100 });
    const gameId = await finishedGame({
      score: 1500,
      correctCount: 9,
      totalTimeMs: 45_000,
    });

    const res = await postEntry({ gameId, nickname: "  Ana  " });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ entryId: expect.any(String), rank: 2 });

    const saved = await db.leaderboardEntry.findUniqueOrThrow({
      where: { gameId },
    });
    expect(saved).toMatchObject({
      id: body.entryId,
      nickname: "Ana",
      level: "BEGINNER",
      score: 1500,
      correctCount: 9,
      totalTimeMs: 45_000,
    });
  });

  it("ranks within the game's level only", async () => {
    await entry("Other level", { level: "ADVANCED", score: 3000 });
    const gameId = await finishedGame({ score: 500 });
    const res = await postEntry({ gameId, nickname: "Ana" });
    expect((await res.json()).rank).toBe(1);
  });

  it("accepts only one entry per game", async () => {
    const gameId = await finishedGame();
    expect((await postEntry({ gameId, nickname: "Ana" })).status).toBe(201);
    const second = await postEntry({ gameId, nickname: "Bia" });
    expect(second.status).toBe(409);
    expect(await errorCode(second)).toBe("ALREADY_SUBMITTED");
  });

  it("rejects a game that is not finished", async () => {
    const gameId = await startGame();
    const res = await postEntry({ gameId, nickname: "Ana" });
    expect(res.status).toBe(409);
    expect(await errorCode(res)).toBe("GAME_NOT_FINISHED");
  });

  it("returns 404 for an unknown game", async () => {
    const res = await postEntry({ gameId: "nope", nickname: "Ana" });
    expect(res.status).toBe(404);
  });

  it("closes submissions 30 minutes after the game ends", async () => {
    const open = await finishedGame({ finishedAgoMs: 29 * MINUTE });
    expect((await postEntry({ gameId: open, nickname: "Ana" })).status).toBe(
      201,
    );

    const closed = await finishedGame({ finishedAgoMs: 31 * MINUTE });
    const res = await postEntry({ gameId: closed, nickname: "Bia" });
    expect(res.status).toBe(410);
    expect(await errorCode(res)).toBe("SUBMISSION_CLOSED");
  });

  it.each(["ab", "Claude", "merda", "<b>hi</b>"])(
    "rejects the nickname %s",
    async (nickname) => {
      const gameId = await finishedGame();
      const res = await postEntry({ gameId, nickname });
      expect(res.status).toBe(400);
      expect(await errorCode(res)).toBe("INVALID_INPUT");
      expect(await db.leaderboardEntry.count()).toBe(0);
    },
  );

  it("rate limits to 10 submissions per hour per IP", async () => {
    const ip = nextIp();
    for (let i = 0; i < 10; i++) {
      const gameId = await finishedGame();
      expect(
        (await postEntry({ gameId, nickname: `Ana ${i}` }, ip)).status,
      ).toBe(201);
    }
    const gameId = await finishedGame();
    const res = await postEntry({ gameId, nickname: "Ana 10" }, ip);
    expect(res.status).toBe(429);
    expect(await errorCode(res)).toBe("RATE_LIMITED");
    expect((await postEntry({ gameId, nickname: "Ana 10" })).status).toBe(201);
  });
});

describe("GET /api/leaderboard", () => {
  it("orders by score, correct answers, time and then registration order", async () => {
    const t0 = new Date(Date.now() - 10 * MINUTE);
    const later = new Date(t0.getTime() + MINUTE);
    await entry("slow", { score: 1000, correctCount: 8, totalTimeMs: 90_000 });
    await entry("late", {
      score: 1000,
      correctCount: 8,
      totalTimeMs: 60_000,
      createdAt: later,
    });
    await entry("early", {
      score: 1000,
      correctCount: 8,
      totalTimeMs: 60_000,
      createdAt: t0,
    });
    await entry("more correct", { score: 1000, correctCount: 9 });
    await entry("best", { score: 1200, correctCount: 7 });

    const res = await getLeaderboard("level=beginner&period=all");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain(
      "s-maxage=30, stale-while-revalidate=60",
    );
    const body = await res.json();
    expect(
      body.entries.map((e: { rank: number; nickname: string }) => [
        e.rank,
        e.nickname,
      ]),
    ).toEqual([
      [1, "best"],
      [2, "more correct"],
      [3, "early"],
      [4, "late"],
      [5, "slow"],
    ]);
    expect(Object.keys(body.entries[0]).sort()).toEqual(
      [
        "correctCount",
        "createdAt",
        "id",
        "nickname",
        "rank",
        "score",
        "totalTimeMs",
      ].sort(),
    );
  });

  it("the rank returned on submission matches the listing", async () => {
    await entry("A", { score: 1000, correctCount: 8, totalTimeMs: 50_000 });
    await entry("B", { score: 1000, correctCount: 8, totalTimeMs: 70_000 });
    const gameId = await finishedGame({
      score: 1000,
      correctCount: 8,
      totalTimeMs: 60_000,
    });
    const { rank } = await (
      await postEntry({ gameId, nickname: "Myself" })
    ).json();

    const { entries } = await (
      await getLeaderboard("level=beginner&period=all")
    ).json();
    expect(
      entries.find((e: { nickname: string }) => e.nickname === "Myself").rank,
    ).toBe(rank);
    expect(rank).toBe(2);
  });

  it("week covers the last 7 days; all covers everything", async () => {
    await entry("recent", {
      score: 100,
      createdAt: new Date(Date.now() - 6 * 24 * 60 * MINUTE),
    });
    await entry("old", {
      score: 2000,
      createdAt: new Date(Date.now() - 8 * 24 * 60 * MINUTE),
    });

    const week = await (await getLeaderboard("level=beginner")).json();
    expect(week.period).toBe("week");
    expect(week.entries.map((e: { nickname: string }) => e.nickname)).toEqual([
      "recent",
    ]);

    const all = await (
      await getLeaderboard("level=beginner&period=all")
    ).json();
    expect(all.entries.map((e: { nickname: string }) => e.nickname)).toEqual([
      "old",
      "recent",
    ]);
  });

  it("filters by level and honors the limit", async () => {
    for (let i = 0; i < 3; i++) await entry(`B${i}`, { score: 100 * i });
    await entry("M", { level: "MIXED", score: 999 });

    const mixed = await (await getLeaderboard("level=mixed")).json();
    expect(mixed.entries).toHaveLength(1);

    const top2 = await (await getLeaderboard("level=beginner&limit=2")).json();
    expect(top2.entries.map((e: { nickname: string }) => e.nickname)).toEqual([
      "B2",
      "B1",
    ]);
  });

  it.each([
    "",
    "level=expert",
    "level=beginner&period=month",
    "level=beginner&limit=51",
  ])("rejects the query %j", async (query) => {
    const res = await getLeaderboard(query);
    expect(res.status).toBe(400);
  });
});
