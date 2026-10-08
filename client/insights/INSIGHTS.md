# client — insights

Notes the previous session left for this one. Append-only: add dated entries,
never rewrite old ones — supersede them with a new entry instead.

## What Works

### 2026-10-08 — Count from the list the cards render from
`FindingsPanel` derives the severity pills from the same array it renders
(after "hide low confidence"), so a pill can never disagree with the cards below
it. Counting the raw `findings` prop looks equivalent until the toggle is on.
Evidence: `src/app/repos/[repoId]/pulls/[number]/_components/FindingsPanel/FindingsPanel.tsx:37`

## What Doesn't Work

### 2026-10-07 — The design's `toFixed(3)` cost format hides real runs
The mockup's `CostBadge` formats below $1 with `toFixed(3)`, so a typical
$0.00015 review renders as `$0.000` — the fake zero the spec forbids. Use
`formatCost`, which keeps three significant digits below $1.
Evidence: `src/lib/format-cost.ts:9`

## Codebase Patterns

### 2026-10-08 — Popovers in the PR list must be portalled
`tableCard` clips with `overflow: hidden` (it keeps the rounded corners), so an
absolutely positioned popover inside a row is cut off. `FindingsPopover` renders
into `document.body` with fixed positioning; its scroll-close listener ignores
scroll events from inside the popover, or scrolling its own list would close it.
Evidence: `src/app/repos/[repoId]/pulls/styles.ts:90`, `src/app/repos/[repoId]/pulls/_components/FindingsCell/FindingsCell.tsx:45`

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

### 2026-10-08 — `SeverityBadge` puts the label before the count
`<SeverityBadge count={2} />` renders "CRITICAL 2". For the "2 CRITICAL" format
use `SeverityPill` from `src/components/severity`.
Evidence: `src/vendor/ui/primitives/Badge.tsx:80`

## Recurring Errors & Fixes

### 2026-10-08 — A disabled-and-pressed toggle traps the user
Disabling every filter button whose level has zero findings also disabled the
*active* one once "hide low confidence" emptied its level, leaving a pressed
button that could not be released. Fix: never disable the active filter.
Evidence: `src/app/repos/[repoId]/pulls/[number]/_components/FindingsPanel/FindingsPanel.tsx:93`

## Session Notes

### 2026-10-07 — Lab 1: run cost
Added `formatCost` + `CostBadge`; cost now shows in the PR list Cost column,
on each timeline run tile and as a COST block in the trace drawer. Checked on
a live run via screenshots of all three places.
Evidence: `src/lib/format-cost.ts:21`, `src/components/cost-badge/CostBadge.tsx:7`

### 2026-10-08 — Homework 1: findings by severity
Severity pills + filter in review run cards, severity icons on timeline tiles,
FINDINGS column with a read-only hover preview in the PR list. Verified with a
scripted browser on live reviews of demo PR #3: pills 1/1/2, Critical filter
leaves the single SSRF card, preview shows 4 findings and no buttons.
Evidence: `src/lib/findings.ts:13`, `src/app/repos/[repoId]/pulls/_components/FindingsCell/FindingsCell.tsx:17`

## Open Questions
