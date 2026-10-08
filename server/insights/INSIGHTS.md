# server — insights

Notes the previous session left for this one. Append-only: add dated entries,
never rewrite old ones — supersede them with a new entry instead.

## What Works

### 2026-10-07 — Store the billed run cost; never recompute it from tokens × price
For `deepseek/deepseek-v4-flash` a real run billed $0.000153636 (matches
OpenRouter `/api/v1/credits` exactly), while tokens × the `/models` list price
gave $0.000514 — 3.3× off. The engine already returns the billed `costUsd`;
persist that number at completion and treat it as the only source of truth.
Evidence: `src/modules/reviews/run-executor.ts:214`, `../reviewer-core/src/llm/openrouter.ts:98`

## What Doesn't Work

## Codebase Patterns

### 2026-10-07 — PR list aggregates belong in SQL, filtered to `done` runs
`GET /repos/:id/pulls` sums cost with `SUM(cost_usd) … WHERE status = 'done'
GROUP BY pr_id`. Failed/cancelled runs carry `cost_usd = null` anyway, but the
status filter keeps a stray costed failure (possible from manual DB edits or
future partial-cost tracking) out of the total. SUM skipping NULLs is what
makes "no costed runs" come back as `null` → "—" in the UI.
Evidence: `src/modules/pulls/routes.ts:140`

## Tool & Library Notes

### 2026-10-07 — OpenRouter usage counters lag behind the generation
`/api/v1/credits` and `/api/v1/key` reported 0 for about a minute after a run
that had already returned `usage.cost`. When cross-checking cost, poll for a
minute instead of reading once and concluding the run was free.
Evidence: `../reviewer-core/src/llm/openrouter.ts:98`

### 2026-10-07 — `MockGitHubClient()` lists a PR #482 by default
Any test that calls `GET /repos/:id/pulls` with the default mock gets an extra
PR upserted into the repo. Pass `new MockGitHubClient({ pulls: [] })` when the
test owns the PR rows.
Evidence: `src/adapters/mocks.ts:138`, `test/reviews.it.test.ts:224`

## Recurring Errors & Fixes

## Session Notes

### 2026-10-07 — Lab 1: run cost
Restored `agent_runs.cost_usd` (migration 0010), threaded the engine's
`costUsd` through the executor, `RunSummary`, trace stats and the PR list sum.
Verified on a live OpenRouter run: DB, API, trace and OpenRouter billing all
show the same number. Integration test covers success, failed-run exclusion
and the no-runs `null` case.

## Open Questions

### 2026-10-07 — A review can run on an empty diff and approve with score 100
`loadDiff` tries `git diff base...head` on the local clone, which only has
`main`, so the PR head commit is missing and the call throws. The fallback reads
`pr_files`, which is filled only when someone opens the PR page. Triggering a
review without opening the page (API, auto-review) yields "0 changed file(s)",
the model is still called and billed, and the run is stored as `approve`/100.
Fix candidates: fetch `refs/pull/N/head` before diffing, and fail the run when
the diff is empty instead of reviewing nothing.
Evidence: `src/modules/reviews/diff-loader.ts:20`, `src/modules/reviews/diff-loader.ts:29`
