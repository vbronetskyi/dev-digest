#!/usr/bin/env bash
# SessionStart: remember where this session started, so the Stop gate can see
# everything the session changed — committed or not.
input=$(cat)
session=$(printf '%s' "$input" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
marker="${TMPDIR:-/tmp}/devdigest-insights-${session:-unknown}"
# Keep the first baseline across resume / compact.
[ -f "$marker" ] || git rev-parse HEAD > "$marker" 2>/dev/null || true
echo "Before changing a package, read its insights/INSIGHTS.md and say which entries apply (engineering-insights skill)."
