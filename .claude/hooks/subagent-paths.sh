#!/usr/bin/env bash
# PreToolUse (Edit|Write) for subagents whose write access is narrower than the
# tool list can say: `tests` lets only test files through, `markdown` only .md,
# `specs` only Markdown under a specs/ folder (spec-creator, implementation-planner).
# Exit 2 blocks the call and hands the message back to the subagent.
mode=$1
path=$(sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
[ -z "$path" ] && exit 0

case $mode in
  tests)
    case $path in
      */test/*|*.test.ts|*.test.tsx) exit 0 ;;
    esac
    echo "Blocked: $path is not a test file. The test writer may change only */test/*, *.test.ts and *.test.tsx — report the production-code problem instead of fixing it." >&2
    ;;
  markdown)
    case $path in
      *.md) exit 0 ;;
    esac
    echo "Blocked: $path is not Markdown. The doc writer changes documentation only — report what the code needs instead." >&2
    ;;
  specs)
    case $path in
      */specs/*.md) exit 0 ;;
    esac
    echo "Blocked: $path is outside specs/. This agent writes specs and plans only — hand code changes to the implementer." >&2
    ;;
  *) exit 0 ;;
esac
exit 2
