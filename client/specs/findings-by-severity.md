# Spec: findings by severity

Three places show how a review run's findings split by severity. All of them
group findings that are already loaded; none triggers a model call.

Levels and order are fixed: `CRITICAL → WARNING → SUGGESTION`
(`SEVERITIES` in `src/lib/findings.ts`).

## Review run card — PR page → Agent runs → Review runs

Inside an expanded run card, under the verdict banner and PR score:

1. **Count row** — `N CRITICAL · N WARNING · N SUGGESTION`, one `SeverityPill` per
   level that has findings; empty levels are omitted.
2. **Filter buttons** — always the three levels. Clicking one keeps only that
   level's finding cards; clicking the active one again shows the full list.
   A level with zero findings is disabled, except when it is the active filter,
   so an active filter can always be switched off.
3. **Invariant:** each pill equals the number of cards of its level rendered
   below. Counts are computed from the same list the cards come from, after the
   "hide low confidence" toggle — hiding low-confidence findings lowers the pills
   too.

The filter is per card; state lives in `FindingsPanel`.

## Timeline tile — PR page → Agent runs → Timeline

Each finished run with a review shows `SeverityCount` icons (icon + number) for
its present levels. Display only — no click, no popover.

## PR list — FINDINGS column and preview

- The column shows `SeverityCount` icons for the latest review
  (`PrMeta.findings_by_severity`, see `server/specs/pr-list.md`), or "—" when the
  PR was never reviewed or came back clean.
- Hover or keyboard focus opens a preview titled **"N findings in this run"**.
  It loads `GET /pulls/:id/reviews` on first open (cached by TanStack Query),
  picks the newest `kind = 'review'` record and lists its findings, most severe
  first. Each preview shows the severity badge, title, category, `file:line`,
  confidence in % and a two-line plain-text rationale.
- The preview is **read-only**: no buttons. Accept / Dismiss live only on the
  PR page's run cards.
- It is portalled to `document.body` with fixed positioning (the table card clips
  overflow), opens below the cell or above it when there is more room there,
  closes 120 ms after the pointer leaves unless the pointer moves onto it, and
  closes on page scroll but not when its own list scrolls.

## Tests

`src/lib/findings.test.ts`, `FindingsPanel.test.tsx`, `RunHistory.test.tsx`,
`FindingsCell.test.tsx`, `FindingsPopover/helpers.test.ts`.
