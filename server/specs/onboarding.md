# Spec: onboarding tour (L05)

Feature spec and acceptance criteria: `../../specs/onboarding/spec.md` (SPEC-02). This
file is how it works today. Code: `src/modules/onboarding/`.

## Facts ($0, `facts.ts`)

From the git tree (`listFiles`): languages by extension, top-level directories, package
manager per lockfile, Dockerfile / Compose / env example / CI workflows by path. From at
most ten `package.json` (shallowest first, ≤ 64 KB, read with `readCommitted`, invalid
JSON ignored): name, scripts, recognised frameworks, the manager of the lockfile beside
it. From repo-intel: endpoints and crons (`getRepoFileFacts`), the reading path
(`getTopFilesByRank`, 8, ties by path, without styles / constants / types), import
chains (`getCriticalPaths`). Context documents: paths only. `capFacts` keeps the JSON
under 24,000 characters.

## Narrative (one call)

Feature model `onboarding` (Settings → registry default → OpenRouter
`deepseek/deepseek-v4-flash`), template `src/prompts/onboarding.system.md`, schema
`OnboardingTour`, 90 s deadline. The facts go as JSON in one `<untrusted source="facts">`
block. `groundTour` keeps five sections in fixed order (architecture, critical paths,
how to run, reading path, first tasks), builds the reading path and chains from the
facts (model notes attached by path, anything else ignored), links only committed
paths, strips links, images and HTML from the prose, and keeps a diagram only if it
starts like a flowchart.

Any failure (no key, schema mismatch, deadline) → `skeletonTour`: the same five
sections from the facts, `meta.source: 'skeleton'`, the reason, `cost_usd: null`.

## API and state

| Endpoint | Behaviour |
|---|---|
| `GET /repos/:id/onboarding` | `{ onboarding }` — stored tour or null; no model call |
| `POST /repos/:id/onboarding` | generate (5/min). 409 without a `full`/`partial` index or while one runs for the repo; 502 when it fell back to a skeleton but a model-written tour is stored (that one is kept) |

One row per repo in `onboarding` (`json` = `Onboarding` with `meta`: source, reason,
model, cost, generated_at, indexed_sha, files_total).

Tests: `test/onboarding-facts.test.ts`, `test/onboarding-helpers.test.ts`,
`test/onboarding.it.test.ts`.
