import { NextResponse } from "next/server";
import { apiError, handleApiError, parseJsonBody } from "@/lib/api";
import { getClientIp, hashIp } from "@/lib/ip-hash";
import { withLogging } from "@/lib/log";
import { consumeRateLimit } from "@/lib/rate-limit";
import { CreateGameInput } from "@/lib/zod-schemas";
import { createGame } from "@/server/games";

const GAMES_PER_HOUR = 20;

export const POST = withLogging("/api/games", async (request: Request) => {
  const parsed = await parseJsonBody(request, CreateGameInput);
  if ("response" in parsed) return parsed.response;

  const ipHash = hashIp(getClientIp(request.headers));
  if (!(await consumeRateLimit(`games:${ipHash}`, GAMES_PER_HOUR))) {
    return apiError("RATE_LIMITED", "Too many games, try again later", 429);
  }

  try {
    return NextResponse.json(await createGame({ ...parsed.data, ipHash }), {
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
