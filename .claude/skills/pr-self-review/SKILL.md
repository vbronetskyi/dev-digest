---
name: pr-self-review
description: Self-review gate for DevDigest pull requests. Runs the package checks, verifies the repository invariants (mirrored contracts, untouched migrations and lockfiles, i18n, null-not-zero, tests at the right layer, insights) and drafts the PR description. ALWAYS use it before opening, creating or updating a pull request, and whenever the user says the work is ready for review. Do not open a PR without running it.
---

# PR self-review

Branch: !`git branch --show-current`

Uncommitted changes:
!`git status --short`

A pull request is opened only after every step below passes. If one fails, fix it
or report it — never open the PR "to fix later".

## 1. Scope

1. Find the base: the branch this one was cut from (`main`, or the previous
   lesson's branch for stacked PRs). Check with `git log --oneline --graph -15`.
2. `git diff --stat <base>...HEAD` — every file must belong to the task. Stray
   formatting churn, debug output and unrelated refactors come out.

## 2. Gates — run in every package the diff touches

| Package | Commands |
|---|---|
| `server/` | `pnpm typecheck` · `pnpm depcruise` (0 errors) · `pnpm exec vitest run --exclude '**/*.it.test.ts'` · `pnpm exec vitest run .it.test` if DB code changed |
| `client/` | `pnpm typecheck` · `pnpm test` |
| `reviewer-core/` | `npm run typecheck` · `npm test` |
| `e2e/` | `npm run typecheck`; flows via `./scripts/e2e.sh` when UI journeys changed |

Record the pass counts — they go into the PR description.

## 3. Invariants

Check each against the diff, not from memory:

- **Contracts.** A change under `server/src/vendor/shared` has the identical
  change under `client/src/vendor/shared`. Compare the two hunks.
- **Migrations.** No existing file in `server/src/db/migrations/` changed. A new
  migration exists only if `src/db/schema/*.ts` changed, and `meta/_journal.json`
  grew by exactly one entry.
- **Lockfiles.** Untouched unless adding or removing a dependency was the task.
- **UI text** goes through `client/messages/en/*.json`, not string literals.
- **Unknown is `null`.** No `0`, `""` or `$0.00` standing in for "no data".
- **No secrets.** No `.env`, tokens or keys in the diff.
- **Tests at the right layer.** New behaviour has a test: pure logic → unit,
  SQL or wiring → `*.it.test.ts`, rendering and interaction → `*.test.tsx`.
- **Docs.** A changed contract or behaviour updates the package's `specs/`; a new
  structure updates `docs/` or `AGENTS.md`.
- **Insights.** The touched packages' `insights/INSIGHTS.md` got the session's
  non-obvious findings (dated, with `file:line`), appended — nothing rewritten.

## 4. PR description

Written for the reviewer, in the language the repository's PRs already use:

1. One paragraph: what changed and why it matters to a user of the product.
2. The decisions a reviewer would question, each with its reason. Numbers beat
   adjectives ("billed $0.000154, list price says $0.000514").
3. How it was verified — the commands from step 2 with their counts, plus what
   was checked by hand on the running app.
4. What was found along the way and what was deliberately left out.

No tool-attribution trailers in commits or the PR body.

## 5. Report back

List each gate and invariant as passed or failed. Only when all pass, push and
open the PR against the base from step 1.
