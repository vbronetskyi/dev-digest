# Plan: Project Context Folder (SPEC-01)

**Goal** — reviews read the attached `specs/` / `docs/` / `insights/` documents of the
reviewed repo as untrusted context. **Non-goals** — editing documents, embeddings,
skill-level context, reading from the PR head.

## Contract changes

- `GitClient.listFiles(repo)` → committed files with blob sizes, symlinks left out, `null`
  without a clone; `GitClient.readCommitted(repo, path)` → a file's content at HEAD
  (`git show`), never the working tree. Server port only: the client copy of
  `adapters.ts` is not used by the client and already lags behind.
- `ContextFolder`, `ContextPath`, `ContextDoc`, `ContextDocList`, `ContextDocBody`,
  `AgentContext`, `CONTEXT_MAX_PATHS`, `CONTEXT_SOFT_CAP_TOKENS` in
  `contracts/knowledge.ts` (both copies).
- `agents.context_paths jsonb not null default '[]'` — schema edit, then
  `pnpm db:generate` → new migration; no existing migration touched.

## Tasks

- [ ] T1 `listFiles` + `readCommitted` on the port, the simple-git adapter and
  `MockGitClient` → AC-1, AC-2, AC-16 → `test/git-list-files.test.ts` (real temp repo)
- [ ] T2 Pure helpers `modules/_shared/project-context.ts`: folder kind (deepest wins),
  docs from the tree, packing into the budget with the cut marker → AC-1, AC-10, AC-11 →
  `test/project-context-helpers.test.ts`
- [ ] T3 Migration for `agents.context_paths`; `GET/PUT /agents/:id/context` (dedupe,
  then the zod limits) → AC-6, AC-7 → `test/context.it.test.ts`
- [ ] T4 `context` module: `GET /repos/:id/context` (docs + agents using each, `no_clone`),
  `GET /repos/:id/context/file?path=` (listed paths only, 256 KB cap) → AC-1, AC-3, AC-4,
  AC-5 → `test/context.it.test.ts`
- [ ] T5 Run executor: resolve the agent's paths against the list, read from the commit,
  pack, log the commit and what was cut / left out / missing, pass `specs`, fill
  `specs_read` on done and failed runs → AC-8, AC-9, AC-11, AC-12, AC-13, AC-14, AC-16,
  AC-17 → `test/context.it.test.ts`
- [ ] T6 reviewer-core: the trusted rule before the Project context blocks, only when
  there are documents → AC-15, AC-17 → `reviewer-core/test/prompt.test.ts`
- [ ] T7 Client hooks + Project Context page `/repos/:repoId/context` + nav item; safe
  Markdown; `activeKeyFor` fixed so `/onboarding` (add repo) is not the tour → AC-18,
  AC-19 → `ContextPage.test.tsx`, `app-shell/helpers.test.ts`
- [ ] T8 Agent editor Context tab → AC-20, AC-21, AC-22 → `ContextTab.test.tsx`
- [ ] T9 Docs: `server/specs/context.md`, `client/specs/pages.md`, `AGENTS.md` read-when,
  insights (plumbing, no AC)

## Traceability matrix

| AC | Tasks | Tests | Commit |
|---|---|---|---|
| AC-1 | T1, T2, T4 | git-list-files, project-context-helpers, context.it | |
| AC-2 | T1 | git-list-files "symlinks" | |
| AC-3 | T4 | context.it "no clone" | |
| AC-4 | T4 | context.it "only listed paths" | |
| AC-5 | T4 | context.it "256 KB" | |
| AC-6 | T3 | context.it "order, dedupe" | |
| AC-7 | T3 | context.it "422" | |
| AC-8 | T5 | context.it "review reads attached docs" | |
| AC-9 | T5 | context.it "missing path" | |
| AC-10 | T2 | project-context-helpers "cut" | |
| AC-11 | T2, T5 | project-context-helpers "skip", context.it log | |
| AC-12 | T5 | context.it "map-reduce" | |
| AC-13 | T5 | context.it trace (done + failed) | |
| AC-14 | T5 | context.it assembly + commit log | |
| AC-15 | T6 | prompt.test | |
| AC-16 | T1, T5 | git-list-files "commit, not worktree", context.it | |
| AC-17 | T5, T6 | prompt.test, context.it "no context" | |
| AC-18 | T7 | ContextPage.test | |
| AC-19 | T7 | ContextPage.test "safe markdown, used by" | |
| AC-20 | T8 | ContextTab.test | |
| AC-21 | T8 | ContextTab.test "soft cap" | |
| AC-22 | T8 | ContextTab.test "missing" | |

## Risks

- Paths are per repo but attached per agent (agents are workspace-wide): a missing path
  must never fail a run (AC-7).
- `readFile` on the adapter joins paths without checks — every read goes through the
  discovered list or the validated attach list.
- Token estimate is bytes / 4: rough for non-ASCII text; fine for a budget, labelled "≈".

## Verification

`cd server && pnpm typecheck && pnpm depcruise && pnpm exec vitest run --exclude '**/*.it.test.ts' && pnpm exec vitest run .it.test`
· `cd reviewer-core && npm run typecheck && npm test` · `cd client && pnpm typecheck && pnpm test`
