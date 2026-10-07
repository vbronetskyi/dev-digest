# client — insights

Notes the previous session left for this one. Append-only: add dated entries,
never rewrite old ones — supersede them with a new entry instead.

## What Works

## What Doesn't Work

### 2026-10-07 — The design's `toFixed(3)` cost format hides real runs
The mockup's `CostBadge` formats below $1 with `toFixed(3)`, so a typical
$0.00015 review renders as `$0.000` — the fake zero the spec forbids. Use
`formatCost`, which keeps three significant digits below $1.
Evidence: `src/lib/format-cost.ts:9`

## Codebase Patterns

## Tool & Library Notes

### 2026-10-07 — `messages/en/runs.json` is not uniformly indented
The `"copied"` key sits at a different indent from its siblings. Loading and
re-dumping the file with a JSON library re-indents it and adds an unrelated
line to the diff. Insert new keys textually next to their neighbours.
Evidence: `messages/en/runs.json:71`

### 2026-10-07 — Headless screenshots of the PR page never "settle"
The PR detail page polls active runs every 4 s and keeps an `EventSource` open,
so Chrome's `--virtual-time-budget` waits forever. Use `--timeout=<ms>` and kill
the process after the file appears.
Evidence: `src/lib/hooks/reviews.ts:33`, `src/lib/hooks/reviews.ts:181`

## Recurring Errors & Fixes

## Session Notes

### 2026-10-07 — Lab 1: run cost
Added `formatCost` + `CostBadge`; cost now shows in the PR list Cost column,
on each timeline run tile and as a COST block in the trace drawer. Checked on
a live run via screenshots of all three places.

## Open Questions
