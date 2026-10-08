@AGENTS.md

# Claude Code

Everything above is shared with other agents. These lines are Claude-specific.

- Project skills live in `.claude/skills/`. Use `onion-architecture` before placing
  server or reviewer-core code, `frontend-architecture` before adding client files,
  `pr-self-review` before opening a pull request.
- At the start of a task read the touched packages' insights; at the end run the
  `engineering-insights` skill. A Stop hook (`.claude/hooks/insights-gate.sh`) sends
  the session back once if a package's code changed without its `INSIGHTS.md`.
- Subagents live in `.claude/agents/`. A feature goes spec-first (SDD): `spec-creator` →
  `specs/<feature>/spec.md` (EARS, AC ids) → `researcher` → `implementation-planner` →
  `plan.md` (tasks ↔ AC) → `implementer` → `architecture-reviewer` and `test-writer` in
  parallel (tests from the AC, not from the code) → `plan-verifier` (spec vs code);
  `doc-writer` after. The spec is committed before the code. Reviewer and verifier are
  read-only by their tool lists; a PreToolUse hook (`.claude/hooks/subagent-paths.sh`)
  keeps spec-creator and implementation-planner inside `specs/`, test-writer inside test
  files and doc-writer inside Markdown.
- `.claude/settings.json` denies edits to migrations, lockfiles and `.env` files — if a
  task seems to need one of those, stop and ask instead of working around it.
