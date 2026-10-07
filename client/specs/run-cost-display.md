# Spec: displaying run cost

## Where

| Place | Value | Component |
|---|---|---|
| PR list → **Cost** column | `PrMeta.cost_usd` — sum of the PR's successful runs | `CostBadge` |
| Agent runs → Timeline run tile, under the run time | `RunSummary.cost_usd` of that run | `CostBadge` |
| Trace drawer → Stats → **COST** block | `RunTrace.stats.cost_usd` | `Stat` + `formatCost` |

A run still in flight shows no cost in the timeline; the number appears when it
finishes.

## Format — `formatCost` (`src/lib/format-cost.ts`)

| Input | Output | Why |
|---|---|---|
| `null`, `undefined`, `NaN` | `—` | unknown is not free |
| `0` | `$0` | a genuinely free run |
| below $1 | 3 significant digits: `$0.0004`, `$0.012`, `$0.0123` | single runs cost fractions of a cent; fixed decimals would print `$0.00` |
| $1 and above | 2 decimals: `$1.50`, `$12.35` | ordinary money |

`CostBadge` renders the formatted value in `.mono .tnum`; known cost uses
`--text-secondary`, unknown uses `--text-muted`, and only a known cost gets a
`title` tooltip.

## Invariants

- The UI never shows `$0.00` for missing data.
- Displaying cost makes no request beyond the data the page already loads.
- Covered by `src/lib/format-cost.test.ts`, `RunHistory.test.tsx` and
  `RunTraceDrawer.test.tsx`.
