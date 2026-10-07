# Spec: run cost

What a review run cost in USD, where the number comes from and how it is
aggregated.

## Source of truth

- `reviewer-core` asks OpenRouter for usage accounting (`usage: { include: true }`)
  and sums `usage.cost` over every LLM call of the run, map-reduce chunks and
  structured-output retries included.
- If a call reports no cost, the provider falls back to the price book
  (`container.priceBook`: live OpenRouter prices, then the static
  `estimateCost` table). If neither knows the model, the run's cost is `null`.
- The server **stores** that number in `agent_runs.cost_usd` when the run
  completes. It is never recomputed later from tokens × price: prices change,
  and list price differs from what the provider actually billed.

## Storage

- `agent_runs.cost_usd double precision NULL` (migration `0010`).
- `done` runs: the engine's `costUsd`, which may itself be `null`.
- `failed` / `cancelled` runs: always `null` — partial spend is unknown.

## API

| Endpoint | Field | Meaning |
|---|---|---|
| `GET /pulls/:id/runs` | `cost_usd` on each `RunSummary` | that run's cost or `null` |
| `GET /runs/:id/trace` | `stats.cost_usd` | same number, frozen in the trace; absent on traces saved before cost tracking |
| `GET /repos/:id/pulls` | `cost_usd` on each `PrMeta` | `SUM(cost_usd)` over the PR's `done` runs; `null` when there are none or none were costed |

## Invariants

- Unknown cost is `null` at every layer. `0` means a genuinely free run.
- Failed and cancelled runs never contribute to a PR total.
- Showing cost makes no extra LLM or pricing call: every number is read from
  `agent_runs` or the trace.
- Covered by `test/reviews.it.test.ts` ("records run cost and sums it per PR").
