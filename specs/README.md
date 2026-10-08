# Feature specs

One folder per feature, written before the code (spec-driven development):

| File | Written by | What it is |
|---|---|---|
| `spec.md` | `spec-creator` | behaviour and limits: EARS acceptance criteria `AC-n`, non-goals, edge cases, input provenance, untrusted inputs |
| `plan.md` | `implementation-planner` | tasks traced to AC, the test per task, the traceability matrix |
| `verification.md` | `plan-verifier` | every AC checked against the code and tests on the branch |

A spec describes *what* and its limits, never *how*. When the behaviour changes, the same
spec is updated (with a changelog line), not copied into a v2. When only the
implementation changes, the spec stays as it is.

Package-level `server/specs/`, `client/specs/` describe how things work today; these
feature folders describe a change on its way in.
