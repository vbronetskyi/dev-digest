# Spec: project context folder (L05)

Feature spec and acceptance criteria: `../../specs/project-context/spec.md` (SPEC-01).
This file is how it works today.

## Documents

A context document is a committed `.md` file of the repo's local clone (default branch,
`HEAD`) with a `specs`, `docs` or `insights` directory on its path; the deepest one gives
its folder kind. `GitClient.listFiles` reads paths and blob sizes from `git ls-tree`
(symlinks and submodules left out); `GitClient.readCommitted` reads `HEAD:<path>` —
never the working tree, never the PR head. Pure rules: `modules/_shared/project-context.ts`.

| Endpoint | Behaviour |
|---|---|
| `GET /repos/:id/context` | `{ docs, reason }` — docs with folder, bytes, tokens (≈ bytes/4), `used_by`; `reason: 'no_clone'` and `[]` without a clone |
| `GET /repos/:id/context/file?path=` | a listed document's committed content, cut at 256 K characters; 404 for anything else |
| `GET /agents/:id/context` | `{ paths }` in prompt order |
| `PUT /agents/:id/context` | stores `paths` (`agents.context_paths`): duplicates dropped, then ≤ 20, each repo-relative `.md` without `..` — else 422 |

## In a review

`run-executor` `buildProjectContext`: the agent's paths that the clone lists, read from
the commit, packed by `packContext` into 8,000 tokens (characters / 4) — whole documents
while they fit, the crossing one cut with a marker, the rest left out — each block
starting `Source: <path>` with the document's headings moved two levels down. Passed as
`specs` to reviewer-core, which puts them first in the user message under
`## Project context`, after a trusted rule (reference data; can add findings, never
approve, downgrade or drop one). Every map-reduce call carries the same documents.

Log lines: `context: N document(s) from <sha7>, ≈T tokens`, `… cut at the budget`,
`context: left out, budget spent — …`, `context: not in this repository — …`,
`context: no local clone — …`. Trace: `specs_read` (also on failed runs) and
`prompt_assembly.specs`. No attached documents → the prompt is exactly as before.

Tests: `test/git-list-files.test.ts`, `test/project-context-helpers.test.ts`,
`test/context.it.test.ts`, `reviewer-core/test/prompt.test.ts`.
