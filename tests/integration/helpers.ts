import { POST as createGameRoute } from "@/app/api/games/route";
import { GET as getGameRoute } from "@/app/api/games/[id]/route";
import { POST as answerRoute } from "@/app/api/games/[id]/answer/route";
import { GET as summaryRoute } from "@/app/api/games/[id]/summary/route";
import { db } from "@/lib/db";

const BASE = "http://localhost/api/games";

let ipCounter = 0;
/** A fresh client IP per call keeps rate limits from leaking between tests. */
export function nextIp() {
  ipCounter++;
  return `10.0.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

export async function resetDb() {
  await db.gameAnswer.deleteMany();
  await db.leaderboardEntry.deleteMany();
  await db.gameSession.deleteMany();
  await db.rateLimitHit.deleteMany();
}

export function postGame(body: unknown, ip = nextIp()) {
  return createGameRoute(
    new Request(BASE, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

export function getGame(id: string, locale?: string) {
  const query = locale ? `?locale=${locale}` : "";
  return getGameRoute(new Request(`${BASE}/${id}${query}`), params(id));
}

export function postAnswer(id: string, body: unknown) {
  return answerRoute(
    new Request(`${BASE}/${id}/answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    params(id),
  );
}

export function getSummary(id: string, locale?: string) {
  const query = locale ? `?locale=${locale}` : "";
  return summaryRoute(new Request(`${BASE}/${id}/summary${query}`), params(id));
}

export async function startGame(
  level = "beginner",
  locale = "pt-BR",
): Promise<string> {
  const res = await postGame({ level, locale });
  if (res.status !== 201) throw new Error(`createGame failed: ${res.status}`);
  return ((await res.json()) as { gameId: string }).gameId;
}
