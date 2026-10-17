import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getQuestion } from "@/server/content";
import {
  getGame,
  getSummary,
  nextIp,
  postAnswer,
  postGame,
  resetDb,
  startGame,
} from "./helpers";

type View = {
  status: string;
  index: number;
  total: number;
  score: number;
  streak: number;
  question?: {
    id: string;
    order: number;
    statement: string;
    remainingMs: number;
  };
};

async function view(id: string, locale?: string): Promise<View> {
  const res = await getGame(id, locale);
  expect(res.status).toBe(200);
  return res.json();
}

/** Serves the current question and answers it (correctly unless told otherwise). */
async function answerCurrent(id: string, correct = true) {
  const { question } = await view(id);
  const answer = getQuestion(question!.id)!.answer;
  return postAnswer(id, {
    questionId: question!.id,
    answer: correct ? answer : !answer,
    locale: "pt-BR",
  });
}

async function backdateServedAt(gameId: string, ms: number) {
  await db.gameAnswer.updateMany({
    where: { gameId, answeredAt: null },
    data: { servedAt: new Date(Date.now() - ms) },
  });
}

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("POST /api/games", () => {
  it("creates a game", async () => {
    const res = await postGame({ level: "mixed", locale: "en" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({
      gameId: expect.any(String),
      total: 10,
      timePerQuestionSec: 30,
    });

    const game = await db.gameSession.findUniqueOrThrow({
      where: { id: body.gameId },
    });
    expect(game).toMatchObject({
      level: "MIXED",
      locale: "en",
      status: "IN_PROGRESS",
    });
    expect(new Set(game.questionIds).size).toBe(10);
    expect(game.ipHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects invalid input", async () => {
    expect((await postGame({ level: "expert", locale: "en" })).status).toBe(
      400,
    );
    expect((await postGame({ level: "beginner", locale: "fr" })).status).toBe(
      400,
    );
    const res = await postGame("not json");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: "INVALID_INPUT", message: expect.any(String) },
    });
  });

  it("rate limits to 20 games per hour per IP", async () => {
    const ip = nextIp();
    for (let i = 0; i < 20; i++) {
      expect(
        (await postGame({ level: "beginner", locale: "en" }, ip)).status,
      ).toBe(201);
    }
    const res = await postGame({ level: "beginner", locale: "en" }, ip);
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("RATE_LIMITED");
    expect((await postGame({ level: "beginner", locale: "en" })).status).toBe(
      201,
    );
  });
});

describe("GET /api/games/:id", () => {
  it("returns 404 for an unknown game", async () => {
    const res = await getGame("does-not-exist");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("serves the current question without the answer", async () => {
    const id = await startGame();
    const res = await getGame(id);
    const text = await res.text();
    expect(text).not.toMatch(/"(answer|correctAnswer|explanation|docUrl)"/);

    const body = JSON.parse(text) as View;
    expect(body).toMatchObject({
      status: "IN_PROGRESS",
      index: 0,
      total: 10,
      score: 0,
    });
    expect(body.question).toMatchObject({
      order: 0,
      remainingMs: expect.any(Number),
    });
    expect(body.question!.remainingMs).toBeGreaterThan(29_000);
    expect(body.question!.statement).toBe(
      getQuestion(body.question!.id)!.statement["pt-BR"],
    );
  });

  it("does not restart the timer on reload", async () => {
    const id = await startGame();
    const first = await view(id);
    await backdateServedAt(id, 10_000);
    const second = await view(id);
    expect(second.question!.id).toBe(first.question!.id);
    expect(second.question!.remainingMs).toBeLessThanOrEqual(20_000);
    expect(await db.gameAnswer.count({ where: { gameId: id } })).toBe(1);
  });

  it("serves the statement in the requested locale (D04)", async () => {
    const id = await startGame();
    const { question } = await view(id, "de");
    expect(question!.statement).toBe(getQuestion(question!.id)!.statement.de);
    expect((await getGame(id, "xx")).status).toBe(400);
  });

  it("expires games idle for more than 2h", async () => {
    const id = await startGame();
    await view(id);
    const longAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    await db.gameSession.update({
      where: { id },
      data: { startedAt: longAgo },
    });
    await db.gameAnswer.updateMany({
      where: { gameId: id },
      data: { servedAt: longAgo },
    });

    const body = await view(id);
    expect(body.status).toBe("EXPIRED");
    expect(body.question).toBeUndefined();
    expect(
      (await db.gameSession.findUniqueOrThrow({ where: { id } })).status,
    ).toBe("EXPIRED");

    const res = await postAnswer(id, {
      questionId: "B01",
      answer: true,
      locale: "pt-BR",
    });
    expect(res.status).toBe(410);
  });
});

describe("POST /api/games/:id/answer", () => {
  it("scores a correct answer and reveals the explanation", async () => {
    const id = await startGame("beginner", "en");
    const { question } = await view(id);
    const q = getQuestion(question!.id)!;

    const res = await postAnswer(id, {
      questionId: q.id,
      answer: q.answer,
      locale: "en",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      isCorrect: true,
      correctAnswer: q.answer,
      explanation: q.explanation.en,
      docUrl: q.docUrl,
      streak: 1,
      finished: false,
      timedOut: false,
    });
    expect(body.breakdown.base).toBe(100);
    expect(body.points).toBe(body.score);
    expect(body.points).toBeGreaterThanOrEqual(145);

    const next = await view(id);
    expect(next.index).toBe(1);
    expect(next.question!.id).not.toBe(q.id);
  });

  it("refuses a second answer to the same question", async () => {
    const id = await startGame();
    const { question } = await view(id);
    const body = { questionId: question!.id, answer: true, locale: "pt-BR" };
    expect((await postAnswer(id, body)).status).toBe(200);
    const res = await postAnswer(id, body);
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("ALREADY_ANSWERED");
  });

  it("lets only one of two concurrent answers through", async () => {
    const id = await startGame();
    const { question } = await view(id);
    const body = { questionId: question!.id, answer: true, locale: "pt-BR" };
    const statuses = (
      await Promise.all([postAnswer(id, body), postAnswer(id, body)])
    )
      .map((r) => r.status)
      .sort();
    expect(statuses).toEqual([200, 409]);
    const game = await db.gameSession.findUniqueOrThrow({ where: { id } });
    expect(game.currentIndex).toBe(1);
  });

  it("rejects unserved and non-current questions", async () => {
    const id = await startGame();
    const game = await db.gameSession.findUniqueOrThrow({ where: { id } });

    let res = await postAnswer(id, {
      questionId: game.questionIds[0],
      answer: true,
      locale: "en",
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("QUESTION_NOT_SERVED");

    await view(id);
    res = await postAnswer(id, {
      questionId: game.questionIds[1],
      answer: true,
      locale: "en",
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("WRONG_QUESTION");

    res = await postAnswer(id, {
      questionId: game.questionIds[0],
      answer: "yes",
      locale: "en",
    });
    expect(res.status).toBe(400);
  });

  it("treats answers after 32s as timeouts, measured on the server", async () => {
    const id = await startGame();
    const { question } = await view(id);
    await backdateServedAt(id, 33_000);
    const q = getQuestion(question!.id)!;

    const res = await postAnswer(id, {
      questionId: q.id,
      answer: q.answer,
      locale: "pt-BR",
    });
    const body = await res.json();
    expect(body).toMatchObject({
      isCorrect: false,
      timedOut: true,
      points: 0,
      streak: 0,
    });

    const stored = await db.gameAnswer.findFirstOrThrow({
      where: { gameId: id, order: 0 },
    });
    expect(stored).toMatchObject({
      answer: null,
      isCorrect: false,
      timeMs: 30_000,
    });
  });

  it("accepts a client-reported timeout (answer: null)", async () => {
    const id = await startGame();
    const { question } = await view(id);
    const res = await postAnswer(id, {
      questionId: question!.id,
      answer: null,
      locale: "pt-BR",
    });
    expect(await res.json()).toMatchObject({ timedOut: true, points: 0 });
  });
});

describe("full game and summary", () => {
  it("finishes after 10 answers and returns the summary", async () => {
    const id = await startGame("advanced");
    expect((await getSummary(id)).status).toBe(409);

    let last: { finished: boolean; score: number; streak: number } | undefined;
    for (let i = 0; i < 10; i++) {
      const res = await answerCurrent(id, i !== 4);
      expect(res.status).toBe(200);
      last = await res.json();
      expect(last!.finished).toBe(i === 9);
    }

    const final = await view(id);
    expect(final).toMatchObject({
      status: "FINISHED",
      index: 10,
      score: last!.score,
    });
    expect(final.question).toBeUndefined();

    const res = await postAnswer(id, {
      questionId: "A01",
      answer: true,
      locale: "pt-BR",
    });
    expect(res.status).toBe(409);

    const summaryRes = await getSummary(id, "en");
    expect(summaryRes.status).toBe(200);
    const summary = await summaryRes.json();
    expect(summary).toMatchObject({
      gameId: id,
      level: "advanced",
      score: last!.score,
      correctCount: 9,
      total: 10,
      bestStreak: 5,
      finishedAt: expect.any(String),
    });
    expect(summary.review).toHaveLength(10);
    expect(summary.review[4]).toMatchObject({
      isCorrect: false,
      timedOut: false,
    });
    expect(summary.review[0].explanation).toBe(
      getQuestion(summary.review[0].questionId)!.explanation.en,
    );
    expect(
      summary.byCategory.reduce(
        (n: number, c: { total: number }) => n + c.total,
        0,
      ),
    ).toBe(10);
  });

  it("returns 404 for the summary of an unknown game", async () => {
    expect((await getSummary("nope")).status).toBe(404);
  });
});
