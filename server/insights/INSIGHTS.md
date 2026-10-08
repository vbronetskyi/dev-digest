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

### 2026-10-08 — The seeded General Reviewer speculates beyond the diff
On the clean demo PR #1 it reported a CRITICAL "duplicate /agents prefix" — false:
modules register without a prefix and every route spells its full path. That one
finding dropped the score to 65 and marked the run "rejected". The prompt already
says "only this diff, do not inflate"; `deepseek-v4-flash` ignores it. An A/B copy
with a short "evidence you can and cannot see" section approved PR #1 and still
flagged the SSRF in PR #3 as CRITICAL (it dropped the valid "no timeout" warning).
Evidence: `src/db/seed-prompts.ts:11`, `src/app.ts:169`

## Codebase Patterns

### 2026-10-07 — PR list aggregates belong in SQL, filtered to `done` runs
`GET /repos/:id/pulls` sums cost with `SUM(cost_usd) … WHERE status = 'done'
GROUP BY pr_id`. Failed/cancelled runs carry `cost_usd = null` anyway, but the
status filter keeps a stray costed failure (possible from manual DB edits or
future partial-cost tracking) out of the total. SUM skipping NULLs is what
makes "no costed runs" come back as `null` → "—" in the UI.
Evidence: `src/modules/pulls/routes.ts:140`

### 2026-10-08 — "Latest review" means newest `kind = 'review'`, not newest row
`reviewsForPull` returns summary and review records together, newest first. The
PR list and the client preview both filter to `kind = 'review'`; anything that
shows "the latest run" must do the same or it can pick a summary record.
Evidence: `src/modules/reviews/repository/review.repo.ts:66`, `../client/src/app/repos/[repoId]/pulls/_components/FindingsPopover/helpers.ts:36`

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

### 2026-10-08 — `count(*)` comes back as a string unless cast
Postgres `count(*)` is `bigint`, and postgres-js returns `bigint` as a string, so
`sql<number>` on a bare `count(*)` lies about the runtime type. Cast in SQL: `count(*)::int`.
Evidence: `src/modules/pulls/routes.ts:141`

### 2026-10-08 — A hung model call keeps a run "running" for many minutes
The OpenRouter client times out a request after 90 s and the SDK retries twice;
structured output adds up to three attempts on top. A stalled upstream call can
therefore keep a run at "Reviewing all files in one pass" for ~13 minutes with
no new log line. Seen on a repeat General Reviewer run of PR #1.
Evidence: `../reviewer-core/src/llm/openrouter.ts:54`, `src/modules/reviews/run-executor.ts:191`

### 2026-10-08 — `pnpm typecheck` does not look at tests, and vitest does not type-check
`tsconfig.json` includes only `src/**/*.ts`, and vitest strips types. After
`PromptParts.skills` changed shape, the old `skills: ['…']` calls in
`test/prompt-*.test.ts` compiled "fine" and only failed as wrong runtime output.
After a contract change, grep the tests for the old shape yourself.
Evidence: `tsconfig.json:28`, `test/prompt-structured.test.ts:17`

## Recurring Errors & Fixes

### 2026-10-08 — A stalled model call hangs a run indefinitely (supersedes "~13 minutes")
Supersedes the 2026-10-08 Tool & Library note "A hung model call keeps a run
'running' for many minutes": the bound there is wrong. The openai SDK clears its
timeout once response **headers** arrive (`fetchWithTimeout` → `.finally`), then
reads the body with `response.json()` and no limit. OpenRouter answers 200 at
once and holds the body open while the model generates, so a stalled generation
hangs the run with no upper bound — observed for 11+ minutes with the socket to
OpenRouter still ESTABLISHED. Cancel does not help: it flips the row to
`cancelled`, but no AbortSignal reaches the request, which stays open.
Fix direction: pass an AbortSignal with a total deadline (and the run's cancel
flag) into `completeStructured`.
Evidence: `../reviewer-core/node_modules/openai/core.js:386`, `../reviewer-core/src/llm/openrouter.ts:69`

### 2026-10-08 — Cancel is overwritten when the hung call finally dies (answers the open question)
Answers the 2026-10-08 Open Question "Can a cancelled run come back as `done`?":
yes, the terminal status is overwritten — observed as `failed`. Run `8d9c2c8e` was
cancelled at ~11 min; at 879 s the OS socket gave up (`read ETIMEDOUT`), the
executor's catch ran `completeAgentRun({ status: 'failed' })` and replaced
`cancelled`. A late success would write `done` the same way. In practice the
hang is bounded only by the OS TCP timeout (~15 min here). It recurred on a
second run the same morning, so it is not a one-off.
Evidence: `src/modules/reviews/run-executor.ts:301`, `../reviewer-core/src/llm/openrouter.ts:69`

### 2026-10-08 — An orphaned dev server keeps serving old code on :3001
`scripts/dev.sh` kills only the subshell PID on exit, so the `pnpm dev` →
`tsx watch` tree under it survives (parent becomes PID 1) when the script is
killed. The next stack's watcher then dies on every reload with
`EADDRINUSE 0.0.0.0:3001` while the orphan answers requests with stale code.
If the API ignores your change: `lsof -nP -iTCP:3001 -sTCP:LISTEN`, check the
listener's parent chain, kill the orphaned tree, touch `src/server.ts`.
Evidence: `../scripts/dev.sh:100`, `../scripts/dev.sh:105`

## Session Notes

### 2026-10-07 — Lab 1: run cost
Restored `agent_runs.cost_usd` (migration 0010), threaded the engine's
`costUsd` through the executor, `RunSummary`, trace stats and the PR list sum.
Verified on a live OpenRouter run: DB, API, trace and OpenRouter billing all
show the same number. Integration test covers success, failed-run exclusion
and the no-runs `null` case.
Evidence: `src/db/migrations/0010_tense_nighthawk.sql:1`, `src/modules/reviews/run-executor.ts:214`, `test/reviews.it.test.ts:215`

### 2026-10-08 — Homework 1: findings by severity
`GET /repos/:id/pulls` now returns `findings_by_severity` of the latest review,
counted in Postgres; new `SeverityCounts` contract in both vendor copies.
Reviewed the three demo PRs with all agents: SSRF (#3) found by all three; N+1
(#2) found by General and Security but missed by Performance; clean PR #1 got a
false CRITICAL from General. Integration test covers null → counts → latest-only.
Evidence: `src/modules/pulls/routes.ts:134`, `test/reviews.it.test.ts:273`

### 2026-10-08 — Lab 2: skills library and skills in runs
Skills CRUD with body versioning, SSRF-safe URL import (preview first, imported
skills land disabled), transactional workspace-scoped agent linking, enabled
linked skills passed to the engine in link order, `config.skills` with versions
in the trace, usage stats from the trace, four seeded skills.
A/B on demo PR #2, Performance Reviewer (deepseek-v4-flash), 3 runs each with
`query-efficiency` + `null-not-zero` linked and without: with skills 1/3 found
the N+1, without 0/3. But in 4 of the 6 runs the model said the diff was absent
although the stored prompt has it — so the sample says little about the skill.
This supersedes the Homework 1 note that Performance "missed" the N+1: its L1
run also claimed there was no diff.
Evidence: `src/modules/reviews/run-executor.ts:190`, `src/db/seed-skills.ts:41`

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

### 2026-10-08 — Can a cancelled run come back as `done`?
After a cancel, the in-flight call keeps going. If it ever returns, `runOneAgent`
persists the review and calls `completeAgentRun` with `status: 'done'`
unconditionally, which would overwrite `cancelled`. Not reproduced yet.
Evidence: `src/modules/reviews/run-executor.ts:244`

### 2026-10-08 — Performance Reviewer often claims the diff is missing
On PR #2 the Performance Reviewer (deepseek-v4-flash, single-pass) answered "the
diff is not present" / "no diff content was provided" in 4 of 6 runs, with and
without skills. The stored `prompt_assembly.user` of those runs is identical to
the run that found the N+1 (10 420 chars, `## Diff to review` with the full
hunk). General and Security on the same model read the same diff fine. Next
step: rerun the agent on another model, then bisect its system prompt.
Evidence: `src/modules/reviews/run-executor.ts:285`, `../docs/agent-prompts/performance-reviewer.md:1`

