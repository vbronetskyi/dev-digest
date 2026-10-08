# Design

```
Claude Code ──stdio──▶ devdigest-mcp ──HTTP──▶ Fastify API (:3001) ──▶ Postgres / reviewer-core
```

## Why a separate package over HTTP

The API already owns workspace scoping, run execution, grounding and cost. The
MCP server only translates: names an agent uses into ids, a run's lifecycle into
one tool call, and the API's DTOs into a compact result. Talking HTTP keeps it
from depending on server internals, and it works against any running DevDigest.

## Request flow — `run_agent_on_pr`

1. `GET /repos` → repo by `owner/name` (or a unique name).
2. `GET /repos/:id/pulls` → PR id by number.
3. `GET /agents` → agent by id, name (slugged, so "security-reviewer" matches
   "Security Reviewer") or a unique prefix among enabled agents.
4. `POST /pulls/:id/review {agentId}` → `run_id`.
5. `GET /runs/:id/review` every 3 s until the status leaves `running`, sending a
   progress notification per poll when the client passed a progress token.
6. After `wait_seconds` (default 240) it returns `status: running` with the
   `run_id` and the next step, instead of holding the call.

Claude Code keeps a stdio tool call open for up to 30 minutes of silence, so the
wait is safe there. MCP Inspector's CLI gives up after 60 s — use a smaller
`wait_seconds` there, then `get_findings`.

## Result shaping

`format.ts` keeps a finding to severity, title, `file:line`, category,
confidence, a 400-character `why` and a 240-character `fix`, most severe first,
plus counts per severity. Results are compact JSON: every character is context
the agent pays for.

## Errors

`api.ts` maps `{ error: { code, message } }` (domain errors) and Fastify's
`{ message: "Route GET:/x not found" }` (route missing) to `ApiError`; a network
failure becomes "API is not reachable — start it with ./scripts/dev.sh".
`resolve.ts` raises `ToolError` with what the API does know (repos, PR numbers),
so the model can correct itself.

## Context cost

`tools/list` for the five tools is ≈ 4.1 K characters (≈ 1 K tokens). With tool
search (Claude Code's default) only the tool names and the server
`instructions` are loaded up front; the instructions say when to reach for the
tools. `alwaysLoad: true` in `.mcp.json` would load all five every session.
