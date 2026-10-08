# Spec: pages and the data they load

| Route | What it shows | Data (hook → endpoint) |
|---|---|---|
| `/` | Redirects to the first repo's PR list; empty state links to onboarding | `useRepos` → `GET /repos` |
| `/onboarding` | Add-repository form | `POST /repos` |
| `/repos/:repoId/pulls` | PR list with status filters, sort and refresh | `usePulls` → `GET /repos/:id/pulls`; index badge → `GET /repos/:id/index-state` |
| `/repos/:repoId/pulls/:number` | PR detail: Overview · Agent runs · Files changed, plus the trace drawer | see below |
| `/agents` | Reviewer agents | `GET /agents` |
| `/agents/:id` | Agent editor: Config · Skills · Context (`?tab=`) | `GET/PUT /agents/:id`; Skills tab → `GET/POST /agents/:id/skills`, `GET /skills`; Context tab → `GET/PUT /agents/:id/context`, `GET /repos/:activeRepo/context` |
| `/skills` | Skills Lab: library + editor (`?skill=`, `?tab=`) | `useSkills` → `GET /skills`; editor → `GET/PUT/DELETE /skills/:id`, `/versions`, `/stats`; import → `POST /skills/import[/file]/preview`, `POST /skills/import[/file]` |
| `/repos/:repoId/context` | Project Context: the repo's specs/docs/insights Markdown, read-only (`?doc=`) | `useContextDocs` → `GET /repos/:id/context`; preview → `GET /repos/:id/context/file?path=` |
| `/repos/:repoId/onboarding` | Onboarding Tour | `useOnboarding` → `GET /repos/:id/onboarding`; Generate / Regenerate → `POST` (one model call) |
| `/repos/:repoId/conventions` | Conventions extractor | `useConventions` → `GET /repos/:id/conventions`; scan → `POST /repos/:id/conventions/extract`; `POST /conventions/:id/accept`, `DELETE /conventions/:id` |
| `/settings/:section` | API keys, models | `GET /settings`, `GET /settings/secrets-status`, `PUT /settings`; model lists → `GET /providers/:id/models` |

## PR list — `/repos/:repoId/pulls`

Columns: Pull request · Author · Size · Score · Findings · Status · Cost · Updated.

- **Score** — latest review's score, `—` when never reviewed.
- **Status** — derived on the server: needs review / reviewed / stale for open
  PRs, GitHub state otherwise.
- **Findings** — severity icons of the latest review; hover opens a read-only
  preview of its findings (`findings-by-severity.md`).
- **Cost** — `PrMeta.cost_usd`, rendered per `run-cost-display.md`.
- Opening the list syncs PRs from GitHub when a token is set; without one it
  serves what is persisted.

## PR detail — `/repos/:repoId/pulls/:number`

The PR id is resolved from `:number` through the repo's PR list (`usePulls`),
then:

- `usePullDetail` → `GET /pulls/:id` — body, files, commits. Opening this page is
  also what persists `pr_files` on the server.
- `usePrReviews` → `GET /pulls/:id/reviews` — review runs with their findings.
- `usePrRuns` → `GET /pulls/:id/runs` — the timeline (every run, any status).
- `usePrActiveRuns` → `GET /pulls/:id/runs/active` — polled while runs are live.
- Trace drawer (`?trace=<runId>`) → `GET /runs/:id/trace`, live log over SSE.
- Files changed tab → `useSmartDiff` → `GET /pulls/:id/smart-diff`.

**Overview tab** — the PR description, the intent card and the blast radius card
(`blast-radius.md`), loaded after the PR detail. The intent card reads
`GET /pulls/:id/intent` (free) and derives only on click (`POST`, one model call):
intent quote, in/out of scope, "Derived by <model> · <cost> · for <sha>", and a
note when the PR head moved since.

**Agent runs tab** (`?tab=findings`) has two sections:

- **Timeline** — runs and commits interleaved, newest first. A run tile shows
  its outcome badge, score ring, agent and model, severity icons, run time and
  cost; clicking the agent jumps to its review run, the file icon opens the trace.
- **Review runs** — one collapsible card per review run: verdict banner with PR
  score, the severity count row and filter buttons, then the findings with
  Accept / Dismiss and a "hide low confidence" toggle. The newest run is expanded
  by default.

**Files changed tab** (`?tab=diff`) — Smart order or Original order, finding
markers and the split banner (`smart-diff.md`), plus GitHub comments.

## Project Context and Onboarding (L05)

- **Project Context** — documents grouped by folder kind (specs, docs, insights); the
  selected one shows its path, "used by N agents", token estimate, a GitHub link at the
  default branch and its content in the kit's `Markdown safe` mode (no raw HTML, http(s)
  links only, no images).
- **Agent → Context tab** — the active repo's documents: tick to attach, untick to
  detach, drag or arrows to reorder, eye to preview; saved at once. Token total with a
  warning above 4K; an attached path the active repo lacks is marked missing.
- **Onboarding Tour** — empty state with Generate; then an "on this page" index, five
  sections (safe Markdown, the architecture diagram via `MermaidDiagram`, files linked
  on GitHub at the indexed commit, numbered reading path) and a footer naming model,
  cost and index commit, or the skeleton's reason.

No page triggers an LLM call by being opened. Model calls happen only from
**Run Review**, the intent card's **Derive** and the tour's **Generate / Regenerate**.
