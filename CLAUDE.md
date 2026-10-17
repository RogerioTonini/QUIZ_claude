# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**`.llm/prd.md` is the source of truth** (pt-BR). Read it before doing anything. It defines a public True/False web quiz about Claude Code (3 levels + Mixed, 10 questions/game, 30s timer, server-side scoring, public leaderboard, pt-BR/en/de). The step-by-step plan for phases F1–F7 follows PRD §13. F1 (foundation: scaffold, i18n, layout, tooling, CI), F2 (question bank + content access) and F3 (Prisma schema, game logic, game API) are done; the game UI and the leaderboard are not built yet.

- Build in the phases of PRD §13 (F1 Foundation → F7 Deploy). Each phase must end with `pnpm lint`, `pnpm typecheck` and `pnpm test` all passing.
- If something isn't covered by the PRD, choose the simplest option, record it in `docs/decisions.md` (next `Dxx` row, pt-BR) and keep going. Read the existing decisions first; they refine the PRD.
- Use one branch and one PR per phase (D02).
- The dev machine has no Docker. Dev and test databases are Neon branches (`dev`, `test`); CI uses a Postgres service container in GitHub Actions (D01).
- Do not build anything listed as out of scope (PRD §15: no login, admin/CMS, multiple-choice, extra languages, or runtime AI question generation).
- Docs and UI copy are pt-BR. Code identifiers, file names and commits are in English.
- `docs_projeto/` contains course material and the original brainstorm prompt, not project code.

Update this file at the end of each phase with the real commands and structure.

## Commands

`pnpm` is the package manager.

```
pnpm dev | pnpm build | pnpm start
pnpm lint            # ESLint + prettier --check
pnpm format          # prettier --write
pnpm typecheck       # next typegen && tsc --noEmit (typegen creates PageProps/LayoutProps and next/root-params types)
pnpm test            # Vitest, tests/unit/**/*.test.ts
pnpm test:e2e        # Playwright (Chromium); builds and serves the app on port 3100 itself
pnpm test:integration # Vitest, tests/integration/** — route handlers against real Postgres (needs TEST_DATABASE_URL locally, D19)
pnpm db:migrate      # prisma migrate dev (uses DIRECT_URL via prisma.config.ts)
pnpm db:deploy       # prisma migrate deploy (CI, production)
pnpm db:studio
```

Single test: `pnpm vitest run tests/unit/messages.test.ts -t "<name>"`, or `pnpm playwright test tests/e2e/i18n.spec.ts -g "<name>"`.

Manual, not in CI: `node scripts/check-doc-urls.mts` checks that every `docUrl` in the question bank answers 2xx.

Prisma 7.10.1 is pinned (D17). `postinstall` runs `prisma generate` into `src/generated/prisma` (gitignored); import the client from `@/generated/prisma/client` and use the `db` singleton from `src/lib/db.ts`. The schema has no URLs: the CLI reads them in `prisma.config.ts`, the runtime in `db.ts`. The initial migration was written offline (`prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`); create later ones with `pnpm db:migrate` against the Neon `dev` branch.

**Gotcha:** the Claude Code shell on this machine has `NODE_ENV=development` set. `next build` (and therefore `test:e2e`) then fails prerendering `/_global-error` with "Cannot read properties of null (reading 'useContext')". Run with `$env:NODE_ENV='production'` in the same PowerShell command.

Environment variables (names only in `.env.example`): `DATABASE_URL` (pooled Neon), `DIRECT_URL`, `IP_HASH_SALT`, `NEXT_PUBLIC_SITE_URL`, and `TEST_DATABASE_URL` for integration tests.

## Next.js 16 specifics

This is Next.js 16.4 with breaking changes from older versions. Read the bundled docs in `node_modules/next/dist/docs/` before using an API (see `AGENTS.md`, which `next dev` re-creates).

- `src/proxy.ts` replaces `middleware.ts`. It runs the next-intl middleware.
- `cacheComponents: true` (+ `partialPrefetching`). Route handlers and pages must **not** export `runtime` (D09). Dynamic data needs `Suspense` or `"use cache"`.
- The root layout is `src/app/[locale]/layout.tsx`; there is no `src/app/layout.tsx`. `locale` is a root param: read it with `import { locale } from "next/root-params"` (Server Components only, not Route Handlers). `generateStaticParams` in the layout is required.
- Values exported from a `"use client"` module reach Server Components as client references, not values. Put shared constants in a plain module (example: `src/lib/theme.ts`).

## Architecture

Stack: Next.js App Router + TypeScript strict, Tailwind v4 (CSS-first config in `src/app/globals.css`), next-intl 4, Prisma on Neon Postgres, Zod, Vitest/Playwright, deployed on Vercel.

```
Browser (client components) → Route Handlers /api/* → src/server/** (pure game logic) → Prisma → Postgres
                                                     ↘ src/content/questions.json (server-only)
```

- **The answer never reaches the client early.** `questions.json` is read only through `src/server/content.ts` (`import 'server-only'`). `GET /api/games/:id` must never include `answer`/`explanation`; they come back only from `POST /api/games/:id/answer`. Nothing in `src/server/**` or `src/content/**` may be imported by client components. An E2E test checks that the answer isn't in the HTML or network traffic before the player answers.
- **The server owns time and scoring.** `GameAnswer.servedAt` is set when the question is first served. Elapsed time = `answeredAt - servedAt`, with a +2s tolerance; anything over 32s counts as a timeout. Reloading the page resumes the same question and the timer does not restart. Scoring (PRD §4): base 100/150/200 by question level (Mixed uses each question's own level), time bonus `floor(base*0.5*remaining/30)` (the +2s tolerance only decides whether it's a timeout; for the bonus, `remaining = max(0, 30s − actual elapsed)`, per D03), and a streak bonus starting at the 3rd consecutive correct answer of +10% of base per step, capped at +50%. A wrong answer or timeout scores 0 and resets the streak.
- Game logic in `src/server/game/{draw,scoring,session,summary}.ts` is pure and unit-tested. Mixed games draw 3 beginner / 4 intermediate / 3 advanced questions, with no repeats. `src/server/games.ts` is the I/O layer (Prisma + content) the route handlers in `src/app/api/games/**` call; handlers stay thin (validate with the Zod schemas in `src/lib/zod-schemas.ts`, call the service, map `ApiError` via `handleApiError`). Answer submission uses conditional `updateMany` in a transaction so concurrent answers get 409 (D20).
- Models: `GameSession` (IN_PROGRESS/FINISHED/EXPIRED; expires lazily after 2h idle), `GameAnswer` (`answer=null` means timeout; second answer → 409), `LeaderboardEntry` (one per `gameId`, only within 30 min of FINISHED; the "week" view covers the last 7 calendar days in UTC, per D05), `RateLimitHit` (Postgres sliding window keyed by `sha256(ip + IP_HASH_SALT)`; raw IPs are never stored).
- API errors use the shape `{ "error": { "code", "message" } }` (`src/lib/api.ts`). The full contract is in PRD §6.5; `GET /api/games/:id` of a finished/expired game returns 200 with `status` and no `question` (D18).
- Leaderboard tie-break order: score desc → correctCount desc → totalTimeMs asc → createdAt asc.
- Theme: an inline script in `<head>` (`src/lib/theme.ts`) adds the `dark` class to `<html>` before hydration, based on `localStorage.theme` or `prefers-color-scheme`. Tailwind's `dark:` variant targets that class. Use the color tokens from `globals.css` (`background`, `foreground`, `surface`, `muted`, `border`, `accent`), not raw colors.

## i18n

- Locale-prefixed routes `/pt-BR` (default), `/en`, `/de` (`src/i18n/routing.ts`). `/` redirects by `Accept-Language`, and the `NEXT_LOCALE` cookie stores the choice.
- Use `Link`/`useRouter`/`usePathname` from `@/i18n/navigation`, not from `next/link` or `next/navigation`.
- Every UI string goes through next-intl (`messages/*.json`), never hardcoded. Message keys are typed from `messages/pt-BR.json` (`src/global.d.ts`). `tests/unit/messages.test.ts` fails if a key is missing or empty in any locale.
- If the player switches language mid-game, the current question reloads in the new locale through `?locale=` (D04).
- Keyboard answer keys depend on locale: pt-BR `V`/`F`, en `T`/`F`, de `W`/`F`.
- Product terms (Claude Code, hooks, MCP, CLAUDE.md, slash commands, Plan mode, subagents) are never translated.

## Question content rules

`src/content/questions.json` is validated by `QuestionBankSchema` (`src/lib/zod-schemas.ts`, which also exports `LEVELS`/`CATEGORIES`) plus a required test (`tests/unit/content.test.ts`). Server code reads it only through `src/server/content.ts` (`getQuestion`, `getQuestionsByLevel`, `toPublicQuestion(q, locale)`, which strips `answer`/`explanation`/`docUrl`). Vitest aliases `server-only` to its empty entry so server modules can be unit-tested.

- `id` is unique, there are exactly 10 questions per level, and all 3 locales are filled in both `statement` and `explanation`.
- `explanation` starts with a prefix that matches `answer`: `Verdadeiro.`/`Falso.`, `True.`/`False.`, `Wahr.`/`Falsch.`. This guards against translations flipping T/F.
- `docUrl` is HTTPS. Check facts and links against https://code.claude.com/docs before release.
- Avoid volatile facts (prices, model names, numeric limits) and double negatives.

## Git and CI

Commits follow Conventional Commits, enforced by `.githooks-scripts/commit-msg`. Allowed types: `build|chore|ci|data|docs|init|feat|fix|perf|revert|refactor|style|test`, plus optional `(scope)` and `!`. Use `data:` for question-content changes. In a fresh clone, activate the hook with `git config core.hooksPath .githooks-scripts`.

`.github/workflows/ci.yml` runs lint → typecheck → test → db:deploy → test:integration → test:e2e on every PR and on pushes to `main`, with a Postgres 17 service container.
