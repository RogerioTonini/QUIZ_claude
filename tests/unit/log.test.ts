import { afterEach, describe, expect, it, vi } from "vitest";
import { withLogging } from "@/lib/log";

afterEach(() => vi.restoreAllMocks());

describe("withLogging", () => {
  it("passes the response through and logs one JSON line", async () => {
    const info = vi.spyOn(console, "log").mockImplementation(() => {});
    const handler = withLogging("/api/test", async () =>
      Response.json({ ok: true }, { status: 201 }),
    );

    const res = await handler(new Request("http://x/api/test?ip=secret"));

    expect(res.status).toBe(201);
    expect(info).toHaveBeenCalledOnce();
    const line = JSON.parse(info.mock.calls[0][0] as string);
    expect(line).toMatchObject({
      level: "info",
      method: "GET",
      route: "/api/test",
      status: 201,
    });
    expect(typeof line.durationMs).toBe("number");
    expect(JSON.stringify(line)).not.toContain("secret");
  });

  it("turns an unexpected exception into a logged 500 with the API error shape", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withLogging("/api/test", async () => {
      throw new Error("db down");
    });

    const res = await handler(
      new Request("http://x/api/test", { method: "POST" }),
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: { code: "INTERNAL", message: "Internal server error" },
    });
    const line = JSON.parse(error.mock.calls[0][0] as string);
    expect(line).toMatchObject({
      level: "error",
      status: 500,
      error: "db down",
    });
  });
});
