# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Pre-implementation. The repo currently holds only the spec — **`.llm/prd.md` is the source of truth** (pt-BR). Read it before doing anything. It defines a public True/False web quiz about Claude Code (3 levels + Mixed, 10 questions/game, 30s timer, server-side scoring, public leaderboard, pt-BR/en/de).

- Build in the phases of PRD §13 (F1 Foundation → F7 Deploy). Each phase must end with `pnpm lint`, `pnpm typecheck` and `pnpm test` all passing.
- If something isn't covered by the PRD, choose the simplest option, record it in `docs/decisions.md` (next `Dxx` row, pt-BR) and keep going. Read the existing decisions first; they refine the PRD.
- Use one branch and one PR per phase (D02).
- The dev machine has no Docker. Dev and test databases are Neon branches (`dev`, `test`); CI uses a Postgres service container in GitHub Actions (D01).
- Do not build anything listed as out of scope (PRD §15: no login, admin/CMS, multiple-choice, extra languages, or runtime AI question generation).
- Docs and UI copy are pt-BR. Code identifiers, file names and commits are in English.
- `docs_projeto/` contains course material and the original brainstorm prompt, not project code.

Once the scaffold exists, update this file with the real commands and structure, and remove anything here that turns out to be wrong.

## Commands (planned, PRD §12)

`pnpm` is the package manager.

```
pnpm dev | pnpm build | pnpm lint | pnpm typecheck
pnpm test            # Vitest unit tests
pnpm test:e2e        # Playwright (+ @axe-core/playwright a11y checks)
pnpm db:migrate      # Prisma migrations (uses DIRECT_URL)
pnpm db:studio
```

Single test: `pnpm vitest run tests/unit/scoring.test.ts -t "<name>"`, or `pnpm playwright test tests/e2e/<file>.spec.ts`.

Environment variables (`.env.example` lists names only): `DATABASE_URL` (pooled Neon), `DIRECT_URL`, `IP_HASH_SALT`, `NEXT_PUBLIC_SITE_URL`.

## Architecture (planned)

Stack: Next.js App Router + TypeScript strict, Tailwind, next-intl, Prisma on Neon Postgres, Zod, Vitest/Playwright, deployed on Vercel.

```
Browser (client components) → Route Handlers /api/* → src/server/** (pure game logic) → Prisma → Postgres
                                                     ↘ src/content/questions.json (server-only)
```

- **The answer never reaches the client early.** `questions.json` is read only through `src/server/content.ts` (`import 'server-only'`). `GET /api/games/:id` must never include `answer`/`explanation`; they come back only from `POST /api/games/:id/answer`. Nothing in `src/server/**` or `src/content/**` may be imported by client components. An E2E test checks that the answer isn't in the HTML or network traffic before the player answers.
- **The server owns time and scoring.** `GameAnswer.servedAt` is set when the question is first served. Elapsed time = `answeredAt - servedAt`, with a +2s tolerance; anything over 32s counts as a timeout. Reloading the page resumes the same question and the timer does not restart. Scoring (PRD §4): base 100/150/200 by question level (Mixed uses each question's own level), time bonus `floor(base*0.5*remaining/30)` (the +2s tolerance only decides whether it's a timeout; for the bonus, `remaining = max(0, 30s − actual elapsed)`, per D03), and a streak bonus starting at the 3rd consecutive correct answer of +10% of base per step, capped at +50%. A wrong answer or timeout scores 0 and resets the streak.
- Game logic in `src/server/game/{draw,scoring,session}.ts` is pure and unit-tested. Mixed games draw 3 beginner / 4 intermediate / 3 advanced questions, with no repeats.
- Models: `GameSession` (IN_PROGRESS/FINISHED/EXPIRED; expires lazily after 2h idle), `GameAnswer` (`answer=null` means timeout; second answer → 409), `LeaderboardEntry` (one per `gameId`, only within 30 min of FINISHED; the "week" view covers the last 7 calendar days in UTC, per D05), `RateLimitHit` (Postgres sliding window keyed by `sha256(ip + IP_HASH_SALT)`; raw IPs are never stored).
- API errors use the shape `{ "error": { "code", "message" } }`. The full contract is in PRD §6.5.
- Leaderboard tie-break order: score desc → correctCount desc → totalTimeMs asc → createdAt asc.
- i18n: locale-prefixed routes `/pt-BR` (default), `/en`, `/de`; `/` redirects by `Accept-Language`; the `NEXT_LOCALE` cookie stores the choice. If the player switches language mid-game, the current question reloads in the new locale through `?locale=` (D04). Every UI string goes through next-intl (`messages/*.json`), never hardcoded. Keyboard answer keys depend on locale: pt-BR `V`/`F`, en `T`/`F`, de `W`/`F`. Product terms (Claude Code, hooks, MCP, CLAUDE.md, slash commands, Plan mode, subagents) are never translated.

## Question content rules

`src/content/questions.json` is validated by a Zod schema plus a required test:
- `id` is unique, there are exactly 10 questions per level, and all 3 locales are filled in both `statement` and `explanation`.
- `explanation` starts with a prefix that matches `answer`: `Verdadeiro.`/`Falso.`, `True.`/`False.`, `Wahr.`/`Falsch.`. This guards against translations flipping T/F.
- `docUrl` is HTTPS. Check facts and links against https://code.claude.com/docs before release.
- Avoid volatile facts (prices, model names, numeric limits) and double negatives.

## Git

Commits follow Conventional Commits, enforced by `.githooks-scripts/commit-msg`. Allowed types: `build|chore|ci|data|docs|init|feat|fix|perf|revert|refactor|style|test`, plus optional `(scope)` and `!`. Use `data:` for question-content changes. The hook isn't active until you run `git config core.hooksPath .githooks-scripts`.
