@AGENTS.md

# Claude Code

Everything above is shared with other agents. These lines are Claude-specific.

- Project skills live in `.claude/skills/`. Use `onion-architecture` before placing
  server or reviewer-core code, `frontend-architecture` before adding client files,
  `pr-self-review` before opening a pull request.
- At the start of a task read the touched packages' insights; at the end run the
  `engineering-insights` skill. A Stop hook (`.claude/hooks/insights-gate.sh`) sends
  the session back once if a package's code changed without its `INSIGHTS.md`.
- `.claude/settings.json` denies edits to migrations, lockfiles and `.env` files — if a
  task seems to need one of those, stop and ask instead of working around it.
