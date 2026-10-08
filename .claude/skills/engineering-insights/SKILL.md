---
name: engineering-insights
description: Maintains per-package INSIGHTS.md files that carry engineering knowledge between sessions. Reads the insights of every package a task touches before the work starts, and appends a dated entry afterwards when the session produced something a future session could not infer from the code alone — a pattern that held up, an approach that failed, a convention, a library quirk, or a recurring error and its fix. Applies to every coding task in this repository.
---

# Engineering insights

A package's `insights/INSIGHTS.md` is what the previous session left for this
one. It is not documentation: `docs/` explains how the package is built and
`specs/` pins down what it must keep doing. Insights record what was learned
the hard way.

## Before the work

Identify the packages the task will touch and read each one's
`insights/INSIGHTS.md`. State the entries that bear on the task before writing
any code — reading silently does not count, summarising forces the content
through.

Treat what you read as high-confidence guidance about this codebase. If the
task contradicts an entry, say so out loud rather than quietly ignoring it: a
stale insight does more damage than a missing one, and it needs superseding.

If a package has no insights file yet, note it and continue.

## Which file to write

For every file you changed, walk up the tree to the nearest directory holding a
`package.json`. That directory is the package root, and the target is
`<package root>/insights/INSIGHTS.md`.

A task spanning several packages produces one entry per package, each about
that package only. Never collapse them into one entry at the repository root.

## When to write

At the end of the task, and again the moment something non-obvious surfaces
mid-task — waiting for the wrap-up is where the details get lost.

One test decides it: **would a competent engineer reading this code already
know it?** If yes, do not write it. Trivial config edits, routine refactors and
anything the type checker or linter already enforces produce no entry.

If nothing qualifies, write nothing — and say that you wrote nothing, so the
silence is visible rather than ambiguous.

## Entry format

Append under the matching section:

```markdown
### 2026-10-06 — Rate limiter shares one Redis client
Constructing `new Redis()` per middleware opens a connection per request under
load. The shared singleton is the only correct source here.
Evidence: `src/middleware/ratelimit.ts:4`
```

Date and at least one `file:line` are mandatory — an entry without evidence is
an opinion. Write so it is actionable cold: the next session reads the entry
and knows what to do without chasing context.

Bad: "be careful with async here".
Good: "`Promise.all()` over the ingest pipeline times out past 30 items — this
module uses `Promise.allSettled()` in batches of 10. Evidence: `src/ingest/run.ts:88`".

## Sections

Every `INSIGHTS.md` uses this fixed set, created on first write:

- **What Works** — approaches that held up
- **What Doesn't Work** — dead ends and antipatterns
- **Codebase Patterns** — conventions and architectural decisions
- **Tool & Library Notes** — quirks of dependencies and tooling
- **Recurring Errors & Fixes** — the mistake, then the fix
- **Session Notes** — dated summaries of substantial sessions
- **Open Questions** — what stayed unresolved

## Append-only

Read the file before writing, every time.

Do not rewrite, reorder or delete existing entries, and do not restate one that
is already there — if the point exists, leave it alone. To correct an entry,
append a new dated one that names the entry it supersedes and why. The history
of what was believed and when is part of the value.
