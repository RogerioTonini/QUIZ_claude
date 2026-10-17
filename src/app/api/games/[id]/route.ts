import { NextResponse } from "next/server";
import { handleApiError, parseLocaleQuery } from "@/lib/api";
import { withLogging } from "@/lib/log";
import { LocaleQuery } from "@/lib/zod-schemas";
import { getGameView } from "@/server/games";

// Never includes the answer or explanation of the current question.
export const GET = withLogging(
  "/api/games/[id]",
  async (request: Request, ctx: RouteContext<"/api/games/[id]">) => {
    const { id } = await ctx.params;
    const locale = parseLocaleQuery(request, LocaleQuery);
    if ("response" in locale) return locale.response;

    try {
      return NextResponse.json(await getGameView(id, locale.data), {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error) {
      return handleApiError(error);
    }
  },
);
