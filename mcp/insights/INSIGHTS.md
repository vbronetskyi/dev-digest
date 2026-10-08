# mcp — insights

Notes the previous session left for this one. Append-only: add dated entries,
never rewrite old ones — supersede them with a new entry instead.

## What Works

## What Doesn't Work

## Codebase Patterns

### 2026-10-08 — stdout is the protocol; exit when the client leaves
Any `console.log` corrupts the stdio stream — log to stderr. And a tool still
polling the API keeps the process alive after the client disconnects, so
`index.ts` exits on transport close.
Evidence: `src/index.ts:8`

## Tool & Library Notes

### 2026-10-08 — MCP Inspector CLI gives up after 60 s; Claude Code does not
A `run_agent_on_pr` that waited 62 s came back from `inspector --cli` with no
result — its client request timeout is 60 s. Claude Code keeps a stdio tool call
open for 30 minutes of silence (28 h overall), so the 240 s default wait is fine
there. In the Inspector, pass `wait_seconds=45` and follow with `get_findings`.
Progress notifications go out when the client sends a progress token.
Evidence: `src/tools/run-agent-on-pr.ts:49`

### 2026-10-08 — Inspector passes only a whitelist of env vars to the server
Variables exported around `inspector --cli` (e.g. `GITHUB_TOOLSETS`) never reach
the spawned server, and `-e` after `--cli` is parsed by the Inspector itself.
Put the env inside a wrapper script (or use `-e` before the command) when
measuring another server.
Evidence: `../.mcp.json:1`

### 2026-10-08 — With tool search, the server instructions carry discovery
Claude Code defers MCP tool definitions by default and loads only tool names and
the server `instructions` (cut at 2 048 chars). The instructions therefore say
when to reach for these tools, not just what they are. `alwaysLoad: true` in
`.mcp.json` or `_meta["anthropic/alwaysLoad"]` on a tool opts out.
Evidence: `src/server.ts:29`

## Recurring Errors & Fixes

## Session Notes

### 2026-10-08 — Lab 4: devdigest-mcp
Five tools over the API, verified with MCP Inspector (UI and CLI) on live data:
`list_agents` → `run_agent_on_pr` (PR #3, security; returned `running` after
45 s) → `get_findings` = CRITICAL SSRF at `routes.ts:174-185` + 4 WARNING,
79 s, $0.0008. An earlier run of the same agent took 346 s and lost the SSRF to
grounding because the model cited `server/src/routes/reviews.ts`; the summary
still named it, which is why results keep `summary`.
Evidence: `src/format.ts:40`, `src/tools/get-findings.ts:1`

## Open Questions

### 2026-10-08 — Should grounding repair a wrong path when the diff has one file?
The 346 s run named the right SSRF but the wrong file, so the gate dropped it and
the run reported 0 findings next to a summary that describes the bug. With a
single-file diff, mapping the citation to that file would have kept it; with
more files it would be guessing. Undecided; lives in reviewer-core's grounding.
Evidence: `src/format.ts:40`
