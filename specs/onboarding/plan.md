# Plan: Onboarding Generator (SPEC-02)

**Goal** — a five-section tour per repo from deterministic facts plus one model call,
with a skeleton fallback. **Non-goals** — Q&A over the repo, reading source files,
sharing, scheduled regeneration.

## Contract changes

- `Onboarding.meta` (nullish, both copies): `source` (`model` | `skeleton`), `reason`,
  `model`, `cost_usd`, `generated_at`, `indexed_sha`, `files_total`. Nullish so the
  design fixture in `test/contracts.test.ts` still parses.
- No migration: the `onboarding` table (`repo_id`, `json`, `generated_at`) already exists;
  meta lives in the JSON.

## Tasks

- [ ] T1 repo-intel facade `getRepoFileFacts(repoId)` (all endpoints/crons) → AC-4 →
  `test/onboarding.it.test.ts`
- [ ] T2 Pure fact builders `modules/onboarding/facts.ts`: languages and layout (AC-1),
  manifests to read and their parse (AC-2, AC-5), infra flags (AC-3), the facts cap (AC-6)
  → `test/onboarding-facts.test.ts`
- [ ] T3 Prompt template rewritten for the five sections; messages with the facts as one
  untrusted JSON block; output schema keyed by section → AC-7, AC-8 →
  `test/onboarding-helpers.test.ts`
- [ ] T4 `groundTour`: fixed order, reading path and chains from the index with the
  model's notes attached, unknown paths dropped, links and images stripped → AC-8, AC-9,
  AC-10, AC-11, AC-12 → `test/onboarding-helpers.test.ts`
- [ ] T5 `skeletonTour(facts, reason)` → AC-14 → `test/onboarding-helpers.test.ts`
- [ ] T6 Service + routes `GET/POST /repos/:id/onboarding`: 409 when not indexed or busy,
  one call under a 90 s deadline, skeleton on failure, a good tour kept on a failed
  regenerate, meta stored → AC-5, AC-7, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-19
  → `test/onboarding.it.test.ts`
- [ ] T7 Client hooks + page `/repos/:repoId/onboarding` + nav item → AC-20, AC-21,
  AC-22, AC-23 → `OnboardingTour.test.tsx`
- [ ] T8 Docs: `server/specs/onboarding.md`, `client/specs/pages.md`, `AGENTS.md`,
  insights (plumbing, no AC)

## Traceability matrix

| AC | Tasks | Tests | Commit |
|---|---|---|---|
| AC-1 | T2 | onboarding-facts "languages, layout" | |
| AC-2 | T2 | onboarding-facts "manifests" | |
| AC-3 | T2 | onboarding-facts "infra by path" | |
| AC-4 | T1, T2 | onboarding.it facts | |
| AC-5 | T2, T6 | onboarding-facts "which manifests", onboarding.it "reads only package.json" | |
| AC-6 | T2 | onboarding-facts "cap" | |
| AC-7 | T3, T6 | onboarding-helpers "untrusted block", onboarding.it "one call" | |
| AC-8 | T3, T4 | onboarding-helpers "five sections" | |
| AC-9 | T4 | onboarding-helpers "reading path" | |
| AC-10 | T4 | onboarding-helpers "chains" | |
| AC-11 | T4 | onboarding-helpers "unknown links" | |
| AC-12 | T4 | onboarding-helpers "no links in prose" | |
| AC-13 | T6 | onboarding.it meta | |
| AC-14 | T5, T6 | onboarding-helpers "skeleton", onboarding.it "model fails" | |
| AC-15 | T6 | onboarding.it "keeps good tour" | |
| AC-16 | T6 | onboarding.it "409 not indexed" | |
| AC-17 | T6 | onboarding.it "409 busy" | |
| AC-18 | T6 | onboarding.it "GET no call" | |
| AC-19 | T6 | onboarding.it "replace" | |
| AC-20 | T7 | OnboardingTour.test "empty" | |
| AC-21 | T7 | OnboardingTour.test "sections, links" | |
| AC-22 | T7 | OnboardingTour.test "footer" | |
| AC-23 | T7 | OnboardingTour.test "no raw HTML"; MermaidDiagram parse gate | |

## Risks

- The model may still write a path inside prose; only links are grounded — prose paths are
  not links, so the UI never turns them into clickable files.
- Index without edges (non-TS repos): reading path falls back to rank order (still AC-5).
- Cost: a large facts block. Facts are capped (top files, endpoints, scripts) to keep the
  call near 5–8K tokens.

## Verification

`cd server && pnpm typecheck && pnpm depcruise && pnpm exec vitest run --exclude '**/*.it.test.ts' && pnpm exec vitest run .it.test`
· `cd client && pnpm typecheck && pnpm test`
