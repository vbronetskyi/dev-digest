# Verification: SPEC-02 Onboarding Generator

By the `plan-verifier` role: a separate agent (Opus), read-only, judging the code and
tests on `hw-3/smart-diff..HEAD` against `spec.md` and `plan.md` — not commit messages.

## Pass 1 — at `b7b48d1`

**Verdict: not ready.** AC-6 and AC-7 deviated, AC-12 had a real gap. What it found and
what happened to each:

| Finding | Kind | Resolution | Commit |
|---|---|---|---|
| AC-6 cap measured on compact JSON, the prompt sends it indented — the text sent could exceed 24,000 | deviation | one serializer for both; the test measures `serializeFacts` | `2f30c79` |
| AC-7 no `maxRetries`: the adapter re-prompts twice on a schema miss — up to 3 calls | deviation | `maxRetries: 0` (a miss becomes the skeleton); spec says what "one call" means; test asserts it | `2f30c79` |
| AC-7 the repository name sat outside the untrusted block | deviation | fixed instruction text; the name lives only in the facts; test asserts nothing repo-made precedes the block | `2f30c79` |
| AC-12 bare URLs and reference-style links survived (GFM re-links bare URLs) | gap | bare URLs become code spans, reference links lose their target, definitions are dropped; tests for each | `2f30c79` |
| AC-9 exclusion by substring: root `styles.ts` slipped through, type-only modules by any name | deviation | basename rule (`styles.*`, `constants.*`, `types.*`, `*.d.ts`), spec wording says "by file name"; tests for root, nested, `.d.ts` and near-misses | `2f30c79` |
| AC-4 note set only when no top files and no endpoints; not shown in model tours | deviation | `indexNoteFor` names every empty part; shown in the architecture section of both tours | `2f30c79` |
| AC-13 tree from the clone's head, links at the indexed commit, never compared | deviation | new AC-24: 409 when they differ | `2f30c79` |
| No clone → a tour of an empty tree | extra | 409 "no local clone" (AC-16 widened) | `2f30c79` |
| AC-16 message with repo-intel off did not say to index | deviation | message says to turn it on and index first; test asserts it | `2f30c79` |
| AC-14 deadline and no-key fallback untested | untested | `deadline.test` (fake timers, 90 s → 502-class error); integration test without any provider | `2f30c79` |
| AC-23 Mermaid parse gate mocked away | untested | `MermaidDiagram.test`: drawn when `parse` passes, nothing (and no `render`) when it fails or for prose | `2f30c79` |

Accepted as is: fixed list caps (8 languages, 12 dirs…) apply even when the facts would
fit — they keep the prompt focused; the skeleton writes its own commands from the facts
(AC-14 asks for a tour from facts alone); the generation date in the footer.

## Pass 2 — at `2a4fa85`

PASS2
