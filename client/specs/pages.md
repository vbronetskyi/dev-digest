# Spec: pages and the data they load

| Route | What it shows | Data (hook → endpoint) |
|---|---|---|
| `/` | Redirects to the first repo's PR list; empty state links to onboarding | `useRepos` → `GET /repos` |
| `/onboarding` | Add-repository form | `POST /repos` |
| `/repos/:repoId/pulls` | PR list with status filters, sort and refresh | `usePulls` → `GET /repos/:id/pulls`; index badge → `GET /repos/:id/index-state` |
| `/repos/:repoId/pulls/:number` | PR detail: Overview · Agent runs · Files changed, plus the trace drawer | see below |
| `/agents` | Reviewer agents | `GET /agents` |
| `/agents/:id` | Agent editor | `GET/PUT /agents/:id` |
| `/settings/:section` | API keys, models | `GET /settings`, `GET /settings/secrets-status`, `PUT /settings`; model lists → `GET /providers/:id/models` |

## PR list — `/repos/:repoId/pulls`

Columns: Pull request · Author · Size · Score · Status · Cost · Updated.

- **Score** — latest review's score, `—` when never reviewed.
- **Status** — derived on the server: needs review / reviewed / stale for open
  PRs, GitHub state otherwise.
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

**Agent runs tab** (`?tab=findings`) has two sections:

- **Timeline** — runs and commits interleaved, newest first. A run tile shows
  its outcome badge, score ring, agent and model, run time and cost; clicking the
  agent jumps to its review run, the file icon opens the trace.
- **Review runs** — one collapsible card per review run: verdict banner with PR
  score, then the findings with Accept / Dismiss and a "hide low confidence"
  toggle. The newest run is expanded by default.

No page triggers an LLM call by being opened. Model calls happen only from
**Run Review**.
