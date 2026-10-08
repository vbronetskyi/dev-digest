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

**Verdict: ready.** Every pass-1 item resolved or covered by the revised spec (AC-9 by
file name, new AC-24). Follow-ups it raised, closed right after in `df030e4`:

| Remaining item | Resolution |
|---|---|
| AC-12: an unmatched backtick from the model could leave a bare URL outside a code span, and GFM would link it | the tour renders prose with `Markdown links="none"`: no link survives even if the server misses one; `OnboardingTour.test` "AC-12" |
| AC-24: the tree and manifests were read at the symbolic `HEAD`, so a resync between the check and the reads could mix commits | both are read at the indexed sha (`listFiles(repo, sha)`, `readCommitted(repo, path, sha)`); `git-list-files.test` "reads … at an explicit commit" |
| AC-9: the rule also covers singular `style.*`, `constant.*`, `type.*` | named in the spec |
| AC-9: eight-step cap untested | `onboarding-helpers.test` "AC-9: the reading path stops at eight steps" |
| plan T6 missing AC-24; `server/specs/onboarding.md` listed only two 409 cases; the AC-16/AC-24 test was titled "AC-13" | updated / renamed |

Accepted as is: the 90 s deadline is proven on `withDeadline` itself (`deadline.test`);
the service path for it is the same `catch` the schema-failure test drives into a
skeleton. `maxRetries: 0` is asserted on what the service sends, which both adapters
honour (`openai.ts`, `openrouter.ts`).
