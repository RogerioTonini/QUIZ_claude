// Manual smoke test against a deployed site (not run in CI). Plays one beginner game through the
// API and checks the public pages; it does not post to the leaderboard.
// Usage: node scripts/smoke.mts https://your-deployment.vercel.app
// For a preview behind Vercel Deployment Protection, set VERCEL_AUTOMATION_BYPASS_SECRET.
const base = process.argv[2]?.replace(/\/$/, "");
if (!base) {
  console.error("Usage: node scripts/smoke.mts <base-url>");
  process.exit(1);
}

const TIMEOUT_MS = 15_000;
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
let failed = 0;

/** fetch with a timeout, so a hung deployment fails the run instead of stalling it. */
function timedFetch(url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (bypassSecret) headers.set("x-vercel-protection-bypass", bypassSecret);
  return fetch(url, {
    ...init,
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

function check(ok: boolean, label: string) {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await timedFetch(base + path, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
  if (!res.ok)
    throw new Error(`${init?.method ?? "GET"} ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

try {
  for (const locale of ["pt-BR", "en", "de"]) {
    const res = await timedFetch(`${base}/${locale}`);
    const html = await res.text();
    check(
      res.ok && html.includes(`lang="${locale}"`),
      `GET /${locale} → ${res.status}`,
    );
    if (locale === "pt-BR") {
      check(
        !!res.headers.get("content-security-policy") &&
          res.headers.get("x-content-type-options") === "nosniff",
        "security headers",
      );
    }
  }

  const board = await timedFetch(
    `${base}/api/leaderboard?level=beginner&period=all`,
  );
  check(board.ok, `GET /api/leaderboard → ${board.status}`);
} catch (error) {
  check(false, (error as Error).message);
}

try {
  const { gameId } = await json<{ gameId: string }>("/api/games", {
    method: "POST",
    body: JSON.stringify({ level: "beginner", locale: "en" }),
  });
  check(true, "POST /api/games");

  let leaked = false;
  for (let i = 0; i < 10; i++) {
    const game = await json<{ question?: Record<string, unknown> }>(
      `/api/games/${gameId}?locale=en`,
    );
    if (!game.question) throw new Error(`no question at index ${i}`);
    if ("answer" in game.question || "explanation" in game.question)
      leaked = true;
    await json(`/api/games/${gameId}/answer`, {
      method: "POST",
      body: JSON.stringify({
        questionId: game.question.id,
        answer: true,
        locale: "en",
      }),
    });
  }
  check(!leaked, "questions never include the answer before answering");

  const summary = await json<{ score: number; correctCount: number }>(
    `/api/games/${gameId}/summary?locale=en`,
  );
  check(
    true,
    `summary: ${summary.correctCount}/10 correct, ${summary.score} points`,
  );
} catch (error) {
  check(false, (error as Error).message);
}

if (failed > 0) {
  console.error(`${failed} check(s) failed.`);
  process.exit(1);
}
console.log("Smoke test passed.");
