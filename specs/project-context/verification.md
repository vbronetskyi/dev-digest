# Verification: SPEC-01 Project Context Folder

By the `plan-verifier` role: a separate agent (Opus), read-only, judging the code and
tests on `hw-3/smart-diff..HEAD` against `spec.md` and `plan.md` — not commit messages.

## Pass 1 — at `b7b48d1`

**Verdict: ready, with gaps.** All 22 criteria and 9 tasks implemented. What it found and
what happened to each:

| Finding | Kind | Resolution | Commit |
|---|---|---|---|
| AC-5 cut counted characters, spec says 256 KB: a multi-byte document up to ~1 MB came back uncut | deviation | cut by UTF-8 bytes, never inside a character; test with 2-byte text checks exactly 262,144 bytes kept | `2f30c79` |
| AC-16 on the review path: the mock logged `readFile` and `readCommitted` together, so a switch back to working-tree reads would pass | untested | mock keeps `worktreeReads` apart; the review test asserts it stays empty | `2f30c79` |
| AC-19 "used by N agents" not tested in the UI | untested | `DocPanel.test` | `2f30c79` |
| AC-15 test checked only half the rule | untested | the "contradicts → finding" sentence asserted, before the first block | `2f30c79` |
| AC-7 "store nothing" not read back after a 422 | untested | the test re-reads the saved paths after the rejected requests | `2f30c79` |
| `.md` matched in any case, `node_modules` excluded, attach rules stricter than written, no-clone state of the tab | wording | spec aligned to the behaviour (AC-1, AC-7, AC-22), changelog entry | `2f30c79` |
| Plan named a `ContextPage.test` that does not exist | plan | matrix points at `DocList`, `DocPanel`, `ContextDocView` tests | `2f30c79` |

Found while closing these: under a loaded integration run, two trace assertions failed
because a run was marked done before its trace was written — fixed for every run, not
just this feature (`e24faea`).

## Pass 2 — at `2a4fa85`

**Verdict: ready.** Every pass-1 item resolved or aligned in the spec; all 22 criteria
match the revised spec. It still listed four small test gaps, closed right after in
`e82b5c9`:

| Remaining item | Resolution |
|---|---|
| AC-5: 2-byte test text always ended on a boundary, so the step-back was never exercised | `context-helpers.test`: 3-byte `€` cut at 10 bytes keeps 9 and no replacement character |
| AC-7 / AC-1: backslash, over 300 characters and upper-case `.MD` had no test | added to the 422 loop and to the folder-kind test; `docs/GUIDE.MD` attaches |
| AC-18: page states untested | `page.test`: no clone, empty with the default branch, `?doc=` selection and fallback |
| `cutAtBytes` lived in `service.ts` | moved to `context/helpers.ts` |

Noted, unchanged: the plan's matrix uses shortened test names.
