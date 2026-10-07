# How the e2e runner works

agent-browser is a command-line browser driver, not a test framework, so this
package adds the smallest possible convention on top of it.

## A flow

`specs/NN-name.flow.json`:

```json
{
  "name": "PR #482 shows its seeded findings",
  "steps": [
    { "cmd": ["open", "{BASE}/"], "label": "load the app root" },
    { "cmd": ["wait", "--url", "/pulls"], "label": "redirect to the PR list" },
    { "cmd": ["wait", "--text", "#482"], "label": "seeded PR visible" }
  ]
}
```

- `{BASE}` becomes `E2E_BASE_URL` (default `http://localhost:3000`).
- `cmd` is passed to `agent-browser` verbatim. A non-zero exit fails the step and
  the flow, so `wait --text` / `wait --url` **are** the assertions — they time out
  when the condition never holds.
- `assert.stdoutIncludes` adds a substring check on the command's output.

## The runner — `run.ts`

1. Reads `specs/`, keeps only files ending in `.flow.json`, sorts them by name
   (the `NN-` prefix is the order). Other files in `specs/`, like this package's
   markdown, are ignored.
2. Runs every flow against one shared browser session.
3. Each step has a timeout (`E2E_STEP_TIMEOUT`, default 60 s).
4. On failure it saves a screenshot to `test-results/` (git-ignored, uploaded as
   a CI artifact) and exits non-zero.

## The hermetic stack — `scripts/e2e.sh`

Brings up a throwaway Postgres container (no volume, so always empty), migrates
and seeds it, starts the API on :3101 and the web app on :3100, runs the flows
and tears everything down. It never touches the dev database, so it is safe to
run while `./scripts/dev.sh` is up. Ports and image are configurable through
`E2E_PG_PORT`, `E2E_API_PORT`, `E2E_WEB_PORT`, `E2E_PG_CONTAINER`, `E2E_PG_IMAGE`.

## In CI

`.github/workflows/e2e-web.yml` starts an empty Postgres, seeds it, boots the
stack and runs the same flows.
