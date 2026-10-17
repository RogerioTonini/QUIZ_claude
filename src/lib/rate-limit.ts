import "server-only";
import { db } from "@/lib/db";

export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/**
 * Sliding-window rate limit stored in Postgres. Records a hit and returns true when the key
 * had fewer than `limit` hits in the window; returns false (and records nothing) otherwise.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  now = new Date(),
): Promise<boolean> {
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);
  // Old hits for this key are useless; drop them so the table doesn't grow forever.
  await db.rateLimitHit.deleteMany({
    where: { key, createdAt: { lt: windowStart } },
  });
  const hits = await db.rateLimitHit.count({
    where: { key, createdAt: { gte: windowStart } },
  });
  if (hits >= limit) return false;
  await db.rateLimitHit.create({ data: { key, createdAt: now } });
  return true;
}
