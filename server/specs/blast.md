# Spec: blast radius

What a pull request can break, answered from the repo-intel index alone.
Module: `src/modules/blast/`. Endpoint: `GET /pulls/:id/blast-radius` → `BlastRadius`.

## Rules

- **No model call, no analysis at request time.** The answer is read from the
  persistent index (`symbols`, `references`, `file_rank`, `file_facts`). The
  facade's ripgrep fallback is never reached: without a `full` / `partial`
  index the endpoint returns `degraded.reason = not_indexed` at once.
- **Budget: 200 ms.** Measured on this repo: p95 7–8 ms server time, ≤ 25 ms
  over HTTP. `duration_ms` is in every response.

## Which symbols changed

The index describes the **base** commit, so the hunks' old-side lines are what
gets compared, not the new-side numbers:

- a removed line touches its old line;
- an inserted line touches the old line it follows;
- context lines touch nothing.

A symbol is changed when its declaration range `[line, endLine]` contains a
touched line. A symbol without a range counts when its file was touched. Files
new in the PR have no base symbols and so no callers — correct, nothing calls
them yet.

## Downstream

Per changed symbol:

- `callers` — resolved references to it (`references.decl_file` = its file),
  named by the enclosing symbol, highest file rank first, at most 20 per symbol.
- `endpoints_affected` / `crons_affected` — from `file_facts` of the symbol's
  own file and of its callers' files. Template-literal routes
  (`/findings/:id/${action}`) are shown as path parameters (`:action`).

`summary` reads like `6 symbols changed → 4 callers, 2 endpoints`.

## Degraded answers

| `degraded.reason` | When |
|---|---|
| `flag_off` | `REPO_INTEL_ENABLED=false` |
| `not_indexed` | no full/partial index for the repo |
| `no_files` | no persisted `pr_files` patches (the PR page was never opened) |

The client shows `degraded.message`; MCP `get_blast_radius` returns it as an
error result.

## Known limits

- Route modules registered by default import (`import reviews from
  './reviews/routes.js'`) do not resolve as callers of `reviewsRoutes`, so a
  route file usually shows 0 callers and its endpoints only.
- Lines are as of `indexed_sha`; if `main` moved and the index did not, ranges
  may be off by the drift.

Tests: `test/blast-helpers.test.ts`, `test/blast.it.test.ts`.
