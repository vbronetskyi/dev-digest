# server — `@devdigest/api`

Fastify 5 API on :3001 over Postgres 16 + pgvector (Drizzle ORM). Imports repos
and PRs, indexes repos (`repo-intel`), stores agents, runs reviews through
`reviewer-core` and persists runs, traces and findings. Package manager: **pnpm**.

## Commands

```sh
pnpm dev                                          # tsx watch, :3001
pnpm typecheck
pnpm depcruise                                    # architecture gate: must stay at 0 errors
pnpm exec vitest run --exclude '**/*.it.test.ts'  # unit, no Docker
pnpm exec vitest run .it.test                     # integration, real Postgres via testcontainers
pnpm db:generate                                  # new migration from schema/*.ts
pnpm db:migrate && pnpm db:seed                   # not run on boot
```

## Map

- `src/app.ts` — `buildApp()`: plugins → DI container → modules → error envelope.
- `src/platform/container.ts` — DI container; every external dependency is an adapter
  behind a port from `@devdigest/shared`. Tests swap them via `ContainerOverrides`.
- `src/modules/<name>/` — feature plugins (`routes.ts` → `service.ts` → `repository.ts`).
  Registered statically in `src/modules/index.ts`.
- `src/modules/reviews/run-executor.ts` — background execution of a review run.
- `src/adapters/` — LLM, GitHub, git, ripgrep, ast-grep, secrets…; `mocks.ts` for tests.
- `src/db/schema/*.ts` — tables; `src/db/migrations/` — generated, never edited.
- `src/vendor/shared/` — the canonical copy of the zod contracts.

## Rules

- Routes declare zod `params`/`body`; invalid input is a 422 before the handler runs.
  Do not `Schema.parse(req.body)` by hand.
- Every query is workspace-scoped (`getContext(container, req)` → `workspaceId`).
- External calls go through the container, never `new Octokit()` / `new OpenAI()` in
  a module.
- Unknown numbers stay `null` (cost, score on failed runs); never write a 0 that
  means "we don't know".
- Contract change → mirror it in `client/src/vendor/shared` in the same commit.

## Read when

- Adding a module, route or adapter → `docs/architecture.md`
- Touching review execution, runs, findings or grounding → `specs/review-flow.md`
- Touching run cost, pricing or the PR list total → `specs/run-cost.md`
- Changing what `GET /repos/:id/pulls` computes → `specs/pr-list.md`
- Touching skills, their import or how a run uses them → `specs/skills.md`
- Touching the conventions extractor → `specs/conventions.md`
- Touching blast radius → `specs/blast.md`
- Writing tests → `../TESTING.md` (and the `.it.test.ts` rule)
- Before any task in this package → `insights/INSIGHTS.md`
