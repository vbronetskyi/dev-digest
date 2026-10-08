# Spec: Blast radius card

PR page → **Overview** tab, under the description. Data: `useBlastRadius(prId)`
→ `GET /pulls/:id/blast-radius` (server rules in `server/specs/blast.md`). The
query starts once the PR detail has loaded — that request is what persists the
PR's files the server needs.

- **Counts:** symbols, callers, endpoints, and crons when there are any;
  labels are plural-aware.
- **Tree (default):** one row per changed symbol (name, file, caller count); the
  first is expanded. Expanded: callers as `file:line` linking to GitHub at
  `indexed_sha` (default branch when absent) plus the enclosing symbol name,
  then endpoint (Globe) and cron (Clock) badges. No callers → "No resolved
  callers".
- **Graph:** one symbol at a time (picker when there are several): symbol →
  up to 8 callers → up to 5 endpoints; endpoints hang off the symbol when it has
  no callers.
- **Footer:** "From the repo index at <sha> · N ms · no model call".
- **Degraded:** the server's message in a note; no zero counts.

Tests: `BlastRadiusCard.test.tsx`.
