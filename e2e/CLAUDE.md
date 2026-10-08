# e2e — `@devdigest/e2e`

Deterministic browser flows over the real stack (web + API + seeded Postgres),
driven by the agent-browser CLI. No Playwright, no LLM, no API keys. Package
manager: **npm**.

## Commands

```sh
./scripts/e2e.sh          # from the repo root: isolated stack on :5433/:3101/:3100, runs, tears down
npm test                  # inside e2e/, against an already running stack (see caveat)
npm run typecheck
```

One-time: `npm i -g agent-browser && agent-browser install`.

## Map

- `run.ts` — runner: loads `specs/*.flow.json` in order, runs each step's command,
  fails on a non-zero exit, saves screenshots to `test-results/`.
- `specs/NN-name.flow.json` — one flow per file.
- `specs/flows.md` — what each flow guarantees.

## Rules

- Locators are deterministic only: `wait --url`, `wait --text`, `find role|text|label`.
  Never the AI `chat` command.
- Flows read seeded data (`acme/payments-api`, PR #482, seeded agents) and never
  click anything that calls a model.
- Prefer the hermetic runner: flows 02/04/05 follow "first repo" and fail on a dev
  DB with other repos imported.
- Never `docker compose down -v` to reset — it deletes the dev database volume.

## Read when

- Writing or debugging a flow, or changing the runner → `docs/runner.md`
- Changing a flow's scope or adding one → `specs/flows.md`
- Before any task in this package → its insights file; the engineering-insights skill
  creates it with the first entry worth keeping (none so far).
