#!/usr/bin/env bash
# Stop: a session that changed a package's code must append to that package's
# insights/INSIGHTS.md, or say that nothing qualified. Blocks once per stop.
input=$(cat)
# The agent was already sent back once and chose to stop: respect it.
printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' && exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

session=$(printf '%s' "$input" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
base=$(cat "${TMPDIR:-/tmp}/devdigest-insights-${session:-unknown}" 2>/dev/null)
git cat-file -e "${base:-HEAD}^{commit}" 2>/dev/null || base=HEAD
changed=$( { git diff --name-only "${base:-HEAD}"; git ls-files --others --exclude-standard; } 2>/dev/null | sort -u)

missing=""
for pkg in server client reviewer-core e2e mcp; do
  # Code only: notes, docs and specs alone do not call for an insight.
  printf '%s\n' "$changed" | grep "^$pkg/" | grep -qvE "^$pkg/(insights|docs|specs)/|\.md$" || continue
  printf '%s\n' "$changed" | grep -qx "$pkg/insights/INSIGHTS.md" || missing="$missing${missing:+, }$pkg"
done
[ -z "$missing" ] && exit 0

printf '{"decision":"block","reason":"This session changed code in %s, but %s did not get an insights entry. Run the engineering-insights skill now: read the file, append what a future session could not infer from the code (dated, with file:line), or say explicitly that nothing qualified."}\n' \
  "$missing" "$( [ "${missing#*,}" = "$missing" ] && echo "its insights/INSIGHTS.md" || echo "their insights/INSIGHTS.md files" )"
