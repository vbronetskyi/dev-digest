# DevDigest

Local-first AI pull-request review: reviewer agents read a PR diff and return
grounded findings with severity and score. Course starter — see README "What you build".

## Stack

| Package | Role | Key libraries |
|---|---|---|
| `server/` (`@devdigest/api`) | Fastify API on :3001 | Fastify 5, Drizzle ORM 0.38, Postgres 16 + pgvector, zod via `fastify-type-provider-zod`, Octokit, OpenAI SDK (talks to OpenRouter) |
| `client/` (`@devdigest/web`) | Studio UI on :3000 | Next.js 15 App Router, React 19, TanStack Query 5, next-intl, Tailwind 4 |
| `reviewer-core/` | Pure review engine: diff → prompt → LLM → grounded findings | TypeScript, zod; the only I/O is an injected `LLMProvider` |
| `e2e/` | Deterministic browser flows, no LLM | agent-browser CLI, `tsx` runner |

TypeScript 5.7, ESM, Node ≥ 22. Tests are vitest everywhere except `e2e/`.

## Layout

Not a workspace. Four standalone packages, each with its own `package.json` and
lockfile; cross-package code is reached through tsconfig path aliases.

- `@devdigest/shared` — zod contracts. Lives in `server/src/vendor/shared`;
  `reviewer-core` imports that copy, **`client/` has its own copy** in
  `client/src/vendor/shared`.
- `@devdigest/reviewer-core` — the server imports its source directly
  (`../reviewer-core/src`); there is no build output.
- `repo-intel` is a server module, not a package: `server/src/modules/repo-intel`.
- `docs/agent-prompts/` — system prompts of the built-in reviewer agents.
- `.claude/skills/` — project skills (stack references + `engineering-insights`).

## Run

`./scripts/dev.sh` — Postgres (Docker) → migrate → seed → API + web
(flags: `--no-seed`, `--no-client`, `--db-only`).

Keys go in `server/.env` (`OPENROUTER_API_KEY`, `GITHUB_TOKEN`) or the Settings UI.
The server does **not** migrate on boot: `cd server && pnpm db:migrate`.

## Verify

Run in the package you changed. There is no linter — `typecheck` is the static gate.

| Package | Typecheck | Tests |
|---|---|---|
| `server/` (pnpm) | `pnpm typecheck` | `pnpm exec vitest run --exclude '**/*.it.test.ts'` (unit) · `pnpm exec vitest run .it.test` (integration, needs Docker) |
| `client/` (pnpm) | `pnpm typecheck` | `pnpm test` |
| `reviewer-core/` (npm) | `npm run typecheck` | `npm test` |
| `e2e/` (npm) | `npm run typecheck` | `./scripts/e2e.sh` from the repo root (hermetic stack) |

## Naming conventions

- Server and reviewer-core files are kebab-case (`run-executor.ts`, `price-book.ts`).
  A module is `server/src/modules/<name>/` with `routes.ts`, `service.ts`,
  `repository.ts`; large repositories split into `repository/<entity>.repo.ts`.
- Client components live in a colocated `_components/<PascalName>/` folder:
  `<PascalName>.tsx`, `index.ts`, `styles.ts` (exports `s`, values
  `satisfies CSSProperties`), `constants.ts` (`UPPER_SNAKE_CASE`), `helpers.ts`,
  `<PascalName>.test.tsx`.
- Data hooks are `use<Thing>` in `client/src/lib/hooks/<domain>.ts`; components
  never call `fetch` directly.
- A zod schema and its inferred type share one PascalCase name (`RunSummary`).
  JSON on the wire is snake_case (`tokens_in`); Drizzle properties are camelCase
  over snake_case columns (`tokensIn` ↔ `tokens_in`).
- UI text goes to `client/messages/en/<namespace>.json`, read via `useTranslations`.
- DB-backed server tests **must** end in `.it.test.ts` — the unit lane excludes them.

## Do not touch

- **`server/src/db/migrations/**`** — never edit, rename, reorder or delete an
  existing migration or anything in `meta/`. Every environment has already run
  them; editing one makes databases drift silently. To change the schema: edit
  `server/src/db/schema/*.ts` → `pnpm db:generate` (appends a new migration) →
  `pnpm db:migrate`.
- **Lockfiles** — `server/pnpm-lock.yaml`, `client/pnpm-lock.yaml`,
  `reviewer-core/package-lock.json`, `e2e/package-lock.json`, `skills-lock.json`.
  Never hand-edit or regenerate them. Dependencies change only through the
  package's own manager (`pnpm add` / `npm install <pkg>`) and only when the task
  needs it. Never run `pnpm install` in an npm package or vice versa.
- `.env` files and `server/clones/` (runtime checkouts).

## Gotchas

- A contract change is **two edits**: `server/src/vendor/shared` and
  `client/src/vendor/shared`. Missing the client copy type-checks fine and breaks
  at runtime.
- Findings that don't cite a real diff line are dropped by the grounding gate, and
  the score is recomputed from survivors — never trust the model's own score.
- `reviewer-core` stays pure: no DB, filesystem, GitHub or env access.
- Never `docker compose down -v` — it deletes the dev database volume.

## Read when

- Working inside a package → that package's `CLAUDE.md` first.
- Writing or placing tests → `TESTING.md`.
- Touching a built-in agent's prompt → `docs/agent-prompts/README.md`.

## Session protocol

Before starting, read `insights/INSIGHTS.md` of every touched package and say which
entries apply. When done, run `engineering-insights`; a Stop hook enforces it.
