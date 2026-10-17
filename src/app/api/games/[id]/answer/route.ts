import { NextResponse } from "next/server";
import { handleApiError, parseJsonBody } from "@/lib/api";
import { AnswerInput } from "@/lib/zod-schemas";
import { submitAnswer } from "@/server/games";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/games/[id]/answer">,
) {
  const { id } = await ctx.params;
  const parsed = await parseJsonBody(request, AnswerInput);
  if ("response" in parsed) return parsed.response;

  try {
    return NextResponse.json(await submitAnswer(id, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
