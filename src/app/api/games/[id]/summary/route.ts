import { NextResponse } from "next/server";
import { handleApiError, parseLocaleQuery } from "@/lib/api";
import { withLogging } from "@/lib/log";
import { LocaleQuery } from "@/lib/zod-schemas";
import { getSummary } from "@/server/games";

export const GET = withLogging(
  "/api/games/[id]/summary",
  async (request: Request, ctx: RouteContext<"/api/games/[id]/summary">) => {
    const { id } = await ctx.params;
    const locale = parseLocaleQuery(request, LocaleQuery);
    if ("response" in locale) return locale.response;

    try {
      return NextResponse.json(await getSummary(id, locale.data));
    } catch (error) {
      return handleApiError(error);
    }
  },
);
