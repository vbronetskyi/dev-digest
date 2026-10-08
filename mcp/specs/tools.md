# Spec: devdigest-mcp tools

Results are JSON text in `content[0].text`. Failures set `isError: true` and say
what to do next.

| Tool | Args | Returns | Side effects |
|---|---|---|---|
| `list_agents` | — | `{agents: [{id, name, checks, model, enabled}]}` | none |
| `run_agent_on_pr` | `repo`, `pr`, `agent`, `wait_seconds?` (10–900, default 240) | compact run (below), or `{run_id, status: "running", next}` after the wait | starts one paid review |
| `get_findings` | `run_id`, or `repo` + `pr` (+ `agent?`) | compact run of that run / the newest **done** run | none |
| `get_conventions` | `repo`, `include_pending?` | `{repo, conventions: [{rule, evidence, confidence, accepted?}], note?}` — accepted only by default | none |
| `get_blast_radius` | `repo`, `pr` | whatever `GET /pulls/:id/blast-radius` returns; an error result while the server has no such route | none |

Compact run:

```json
{ "run_id": "…", "pr": "owner/name#3", "agent": "Security Reviewer", "status": "done",
  "verdict": "request_changes", "score": 47, "blockers": 1,
  "counts": { "CRITICAL": 1, "WARNING": 0, "SUGGESTION": 1 },
  "summary": "…", "cost_usd": 0.0004,
  "findings": [{ "severity": "CRITICAL", "title": "…", "where": "src/x.ts:12", "category": "security",
                 "confidence": 0.9, "why": "≤ 400 chars", "fix": "≤ 240 chars" }] }
```

A failed or cancelled run comes back with `isError: true`, `status` and `error`.

## Invariants

- Only `run_agent_on_pr` writes (annotated `readOnlyHint: false`); the rest are
  read-only.
- Agent matching never guesses between candidates: an ambiguous prefix is an error.
- Nothing is written to stdout except protocol messages.

Tests: `test/tools.test.ts`.
