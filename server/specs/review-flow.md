# Spec: review flow

The lifecycle of one review run, from the button to persisted findings. Every
statement here is behaviour other code and tests rely on.

## Trigger

`POST /pulls/:id/review` with `{ agentId }` for one agent or `{ all: true }` for
every enabled agent.

- One `agent_runs` row per agent is inserted with `status = 'running'` **before**
  the response is sent; the response carries `runs[].run_id`.
- Execution continues in the background. The HTTP response never waits for the
  model.

## Execution (`ReviewRunExecutor`)

1. The PR diff is loaded once for all agents: `git diff base...head` on the local
   clone, falling back to a diff rebuilt from persisted `pr_files` patches.
   If loading fails, **every** queued run is marked `failed` with the error.
2. Per agent, sequentially:
   - resolve the agent's LLM provider (a missing key fails that run only);
   - gather repo context unless the agent opted out of repo-intel: callers of
     changed symbols, the repo skeleton, the "top-5% most depended-on" note;
   - call `reviewPullRequest()` from `reviewer-core`;
   - persist the review and its findings, mark the PR reviewed at `head_sha`;
   - complete the run row and save its trace.
3. Per-agent failures are isolated: one agent failing does not stop the others.

## Run row on completion

| Field | `done` | `failed` / `cancelled` |
|---|---|---|
| `status` | `done` | `failed` / `cancelled` |
| `tokens_in`, `tokens_out` | from the engine | `0` |
| `cost_usd` | billed cost, may be `null` (see `run-cost.md`) | `null` |
| `findings_count` | grounded findings persisted | `0` |
| `score` | recomputed from grounded findings | `null` |
| `blockers` | findings with severity ≥ the agent's `ciFailOn` | `null` |
| `error` | `null` | reason / "Cancelled by user" |

A trace document is saved in every terminal state, so the UI can always show
the log of what happened, including why a run failed.

## Invariants

- Findings that do not cite a real line of the diff never reach the database
  (grounding gate in `reviewer-core`).
- `score` is never the model's self-reported number.
- The timeline outcome (rejected / reviewed / approved) is derived from
  `blockers` and `findings_count`, not from the model's verdict.
- A run left `running` by a dead process is marked `failed` on the next boot.
- Cancelling sets a flag on the `RunBus`; the engine checks it before each LLM
  call, so a cancel takes effect at the next chunk boundary.

## Known gap

If the clone lacks the PR head commit **and** `pr_files` were never loaded (the
PR page was not opened), step 1 produces an empty diff. The run still calls the
model and completes as `approve` with score 100 — see
`insights/INSIGHTS.md` (Open Questions).
