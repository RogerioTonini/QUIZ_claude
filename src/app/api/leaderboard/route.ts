import { NextResponse } from "next/server";
import { apiError, handleApiError, parseJsonBody } from "@/lib/api";
import { getClientIp, hashIp } from "@/lib/ip-hash";
import { consumeRateLimit } from "@/lib/rate-limit";
import { LeaderboardEntryInput, LeaderboardQuery } from "@/lib/zod-schemas";
import { getLeaderboard, submitEntry } from "@/server/leaderboard";

const ENTRIES_PER_HOUR = 10;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = LeaderboardQuery.safeParse({
    level: params.get("level") ?? undefined,
    period: params.get("period") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400);
  }

  const entries = await getLeaderboard(parsed.data);
  return NextResponse.json(
    { level: parsed.data.level, period: parsed.data.period, entries },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, LeaderboardEntryInput);
  if ("response" in parsed) return parsed.response;

  const ipHash = hashIp(getClientIp(request.headers));
  if (!(await consumeRateLimit(`leaderboard:${ipHash}`, ENTRIES_PER_HOUR))) {
    return apiError("RATE_LIMITED", "Too many entries, try again later", 429);
  }

  try {
    return NextResponse.json(await submitEntry(parsed.data), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
