import { apiError } from "@/lib/api";

type Level = "info" | "warn" | "error";

/** One JSON object per line, so Vercel's log search can filter by field. Never log IPs or nicknames. */
export function log(level: Level, fields: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/**
 * Wraps a route handler: logs method, route, status and duration of every request, and turns
 * unexpected exceptions into a logged 500 with the PRD error shape instead of an HTML error page.
 */
export function withLogging<A extends unknown[]>(
  route: string,
  handler: (request: Request, ...rest: A) => Promise<Response>,
) {
  return async (request: Request, ...rest: A): Promise<Response> => {
    // Read the request first: with cacheComponents, the clock may only be read after dynamic data.
    const method = request.method;
    const start = performance.now();
    const durationMs = () => Math.round(performance.now() - start);
    try {
      const response = await handler(request, ...rest);
      log(response.status >= 500 ? "error" : "info", {
        msg: "request",
        method,
        route,
        status: response.status,
        durationMs: durationMs(),
      });
      return response;
    } catch (error) {
      log("error", {
        msg: "unhandled error",
        method,
        route,
        status: 500,
        durationMs: durationMs(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return apiError("INTERNAL", "Internal server error", 500);
    }
  };
}
