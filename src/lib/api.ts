import { NextResponse } from "next/server";
import type { z } from "zod";

export type ApiErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "GAME_EXPIRED"
  | "GAME_FINISHED"
  | "GAME_NOT_FINISHED"
  | "ALREADY_ANSWERED"
  | "WRONG_QUESTION"
  | "QUESTION_NOT_SERVED"
  | "RATE_LIMITED"
  | "ALREADY_SUBMITTED"
  | "SUBMISSION_CLOSED";

/** PRD §6.5 error shape: `{ error: { code, message } }`. */
export function apiError(code: ApiErrorCode, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Expected failure thrown by server code; `handleApiError` turns it into the error response. */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError)
    return apiError(error.code, error.message, error.status);
  throw error;
}

/** Parses `?locale=`; absent means the game's own locale. */
export function parseLocaleQuery<T extends z.ZodType>(
  request: Request,
  schema: T,
): { data: z.infer<T> } | { response: NextResponse } {
  const value = new URL(request.url).searchParams.get("locale") ?? undefined;
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    return { response: apiError("INVALID_INPUT", "Invalid locale", 400) };
  return { data: parsed.data };
}

/** Parses a JSON body against a schema; returns the data or a ready 400 response. */
export async function parseJsonBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { response: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      response: apiError("INVALID_INPUT", "Body must be valid JSON", 400),
    };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      response: apiError("INVALID_INPUT", parsed.error.issues[0].message, 400),
    };
  }
  return { data: parsed.data };
}
