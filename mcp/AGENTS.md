# mcp — `@devdigest/mcp`

`devdigest-mcp`: an MCP server over stdio that lets a coding agent (Claude Code)
run DevDigest reviews and read their results. It is a client of the Fastify API —
no DB, no reviewer-core, no LLM of its own. Package manager: **npm**.

## Commands

```sh
npm run typecheck
npm test          # in-memory MCP client against a fake API — no server needed
npm start         # stdio server; needs the API on $DEVDIGEST_API (default :3001)
npm run inspect   # MCP Inspector UI against this server
```

Registered for Claude Code in the repo-root `.mcp.json` (server name `devdigest`).

## Map

- `src/index.ts` — stdio entry; logs go to **stderr** (stdout is the protocol).
- `src/server.ts` — `createServer()`: server instructions + the five tools.
- `src/tools/*.ts` — one file per tool; `result.ts` turns failures into
  actionable messages.
- `src/resolve.ts` — "owner/name", PR number, agent name → API ids.
- `src/format.ts` — compact result shapes (what an agent acts on, nothing more).
- `src/api.ts` — HTTP client; tells unknown routes apart from domain 404s.

## Rules

- Five tools, each answering something only DevDigest knows. No `list_repos` /
  `list_prs` — `gh` does that already.
- A tool returns a result, not an operation: `run_agent_on_pr` starts, waits and
  collects. Arguments are flat primitives.
- Failures are tool results with `isError` and a next step ("call list_agents"),
  never thrown stack traces.
- Contracts are type-only imports from `../server/src/vendor/shared`.

## Read when

- Changing what a tool accepts or returns → `specs/tools.md`
- Changing transport, resolution or result shaping → `docs/design.md`
- Before any task in this package → `insights/INSIGHTS.md`
