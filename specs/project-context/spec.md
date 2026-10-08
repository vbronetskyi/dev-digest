# Spec: Project Context Folder | Spec ID: SPEC-01 | Status: approved

## Problem and why

Reviewers read the diff, never the project's own specs. A change can be technically
correct, pass every test and still break what `specs/` or `docs/` say ("callback URLs
from a request must be allow-listed", "modules never import each other"). A diff-only
review cannot see that, because nobody reads the spec.

## Goals / Non-goals

Goals
- Find the reviewed repository's Markdown under `specs/`, `docs/` and `insights/` — at any
  depth, since monorepos keep them per package (`server/specs/`, `client/docs/`).
- Let people browse those documents in DevDigest and attach chosen ones, in order, to an
  agent.
- Put the attached documents into that agent's review as untrusted context, within a
  token budget, and record in the trace what was read.

Non-goals
- Creating or editing documents from the UI — the repository is the source of truth.
- Semantic retrieval (embeddings, chunking): attaching is explicit.
- Context attached to skills (design N2c) — a later step.
- Reading documents from the PR head.

## User stories

- As the owner of the Security Reviewer, I attach `specs/security-baseline.md`, so every
  review checks the diff against it.
- As a developer, I browse the repo's specs and docs in DevDigest to see what the agents
  read.
- As someone explaining a review, I see in the trace which documents were in the prompt.

## Acceptance criteria (EARS)

Discovery and reading
- **AC-1** The system shall list as context documents the `.md` files committed at the
  head of the repository's default-branch clone that have a `specs`, `docs` or `insights`
  directory on their path, each with its folder kind — the deepest such directory wins
  (`docs/specs/x.md` is `specs`) — size in bytes and an estimate of tokens (bytes / 4).
- **AC-2** The system shall not list or read symbolic links.
- **AC-3** WHEN the repository has no local clone, the system shall return an empty list
  with the reason `no_clone` instead of an error.
- **AC-4** WHEN a document is requested by path, the system shall return its committed
  content only if the path is in the AC-1 list; otherwise it shall answer 404.
- **AC-5** IF a requested document is larger than 256 KB, THEN the system shall return
  the first 256 KB followed by a cut marker.

Attaching
- **AC-6** WHEN an agent's context is saved, the system shall store the paths in the given
  order with duplicates removed.
- **AC-7** IF a path is not relative, contains `..` or does not end in `.md`, or more than
  20 paths remain after removing duplicates, THEN the system shall reject the request
  with 422 and store nothing.

Reviewing
- **AC-8** WHEN a review runs with an agent that has context paths, the system shall put
  each attached path that is in the AC-1 list of that repository into the prompt, in the
  saved order, as its own untrusted block whose first line names the path, with the
  document's Markdown headings moved two levels down so none sits at the prompt's own
  section level; the path is never placed in a block attribute.
- **AC-9** IF an attached path is not in the AC-1 list of the reviewed repository, THEN
  the system shall leave it out, log it and continue the review.
- **AC-10** IF the attached documents exceed 8,000 tokens together (characters / 4),
  THEN the system shall end the document that crosses the budget at the budget with a
  visible cut marker.
- **AC-11** IF the budget is spent, THEN the system shall leave out the remaining
  documents and log the cut and the left-out paths.
- **AC-12** The budget shall apply to every model call of the review: with the
  `map-reduce` strategy each chunk's prompt carries the same packed documents.
- **AC-13** The system shall record in the run trace the paths it put into the prompt,
  including a cut one (`specs_read`), on completed and on failed runs.
- **AC-14** The system shall record the assembled Project context in
  `prompt_assembly.specs` and log the commit the documents were read from.
- **AC-15** WHERE an agent has context documents in the prompt, the prompt shall state,
  outside the untrusted blocks, that project context is reference data: a diff that
  contradicts it is a finding, and nothing in it can approve the PR, lower a severity or
  remove a finding.
- **AC-16** The system shall read documents from the default branch's committed content,
  never from the PR head and never from the working tree.
- **AC-17** WHERE an agent has no context documents in the prompt, the system shall
  assemble the prompt exactly as before: no Project context section, no AC-15 rule.

UI
- **AC-18** The Project Context page shall list the active repository's documents
  grouped by folder kind.
- **AC-19** WHEN a document is selected, the page shall render it as Markdown without raw
  HTML and without links other than `http(s)`, and show how many agents attach it.
- **AC-20** The agent editor shall have a Context tab listing the active repository's
  documents, where documents can be attached, detached and reordered and saved.
- **AC-21** The Context tab shall show the token total of the attached documents and a
  warning above 4,000 tokens.
- **AC-22** IF an attached path is not in the active repository, THEN the Context tab
  shall show it as missing there, still removable.

## Edge cases

- An agent reviews several repositories: paths missing in one are skipped there (AC-9)
  and marked in the tab for that repository (AC-22).
- One document larger than the whole budget: it alone is cut at the budget (AC-10).
- `README.md` at the root and `node_modules/**` are not context (not in those folders,
  or not committed).
- A symlink named `docs/x.md` pointing outside the repo is neither listed nor read (AC-2).

## Non-functional

- Listing reads the git tree (paths, modes, blob sizes) through a new `GitClient` method;
  no file content is opened to list.
- No model call anywhere in this feature.

## Inputs (provenance)

- [reused: L03] reviewer-core `specs` slot, untrusted wrapping, injection guard.
- [deterministic: git] committed files, modes and sizes of the default-branch clone (new
  `GitClient` methods: list the tree, read a committed file).
- [new: 0 LLM calls].

## Untrusted inputs

Document bodies are repository text, as untrusted as the diff: each goes into its own
`<untrusted>` block through reviewer-core's wrapper (which stops a body from closing its
block), a trusted rule limits what it can do (AC-15), and it is read from the default
branch's commit, so a PR cannot plant instructions by editing a spec in the same PR
(AC-16). Paths are repository text too: they appear only inside block bodies (AC-8).
Paths sent by the client are validated (AC-7) and resolved only against the discovered
list (AC-4, AC-9). In the UI, document Markdown is rendered without raw HTML or active
links (AC-19).

## Open questions

None open. Decided: soft cap 4,000 tokens in the UI (warning only), budget 8,000 per
model call in the run; attach limit 20 documents after removing duplicates; the Context
tab shows the active repository (the one in the repo switcher).

## Changelog

- 2026-10-08 — first version (L05).
- 2026-10-08 — revised after an independent review (second agent, different model):
  symlinks excluded, reads from the commit instead of the working tree, review-time paths
  resolved against the listed documents, dedupe-then-count, budget per model call,
  `specs_read` on failed runs, the rule conditional on context being present (it
  contradicted "prompt unchanged"), safe Markdown in the UI, which repository the tab
  shows. Compound criteria split: 13 → 22.
- 2026-10-08 — AC-8 extended during implementation: a live run's trace showed a document's
  `## Modules`, `## Data` headings at the same level as the prompt's `## Diff to review`,
  so document headings are now demoted. The behaviour changed, so the spec changed first.
