# Spec: smart diff (HW L03)

The PR's files in the order a reviewer should read them, with the latest
findings pinned to their lines and a split proposal for oversized PRs.
`GET /pulls/:id/smart-diff` → `SmartDiff`. Code: `src/modules/smart-diff/`.
Rules only: no model call, no repo index, no clone access.

## Roles

Every file gets one reason; the reason fixes the role. First match wins:

1. Lockfile by name → `lockfile`.
2. Path rules for mechanical files: `generated` (dist/build, snapshots,
   `migrations/meta/`), `test`, `assets`, `i18n` (`messages/`, `locales/`),
   `docs` (`*.md`, `docs/`), `styles` (`*.css`, `styles.ts`), `tooling`
   (`package.json`, `tsconfig*.json`, `*.config.ts`, dotfile configs).
3. No line changes (rename, mode change) → `rename`.
4. A new file whose first lines say `@generated` / `do not edit` → `generated`.
5. Path rules for wiring: `migration` (`*.sql`), `infra` (`.github/`, Docker,
   `.mcp.json`), `entrypoint` (`index|main|app|server|container|bootstrap`),
   `config` (`config|env|settings.ts`, other JSON/YAML/TOML).
6. ≥ 60 % of the meaningful changed lines are imports, re-exports, `require`,
   `.register(` / `.use(` or a bare registry entry → `imports_only`.
7. Everything else → `source`.

| Role | Reasons | UI |
|---|---|---|
| `core` | source | first, open |
| `wiring` | entrypoint, imports_only, config, migration, infra | second |
| `boilerplate` | lockfile, generated, test, docs, i18n, assets, styles, tooling, rename | last, folded |

Inside a group: files with the most severe finding first, then the biggest
change, then the path. Empty groups are omitted.

## Finding markers

From the newest `kind = 'review'` record of each agent on the PR (older reviews
by the same agent are superseded); rejected findings (`dismissed_at`) are left
out. Each file carries `findings` (`id`, `start_line`, `end_line`, severity,
title) on new-side line numbers, and `finding_lines` (distinct start lines).
`reviews_used` says how many reviews that was — 0 before the first run.

Reviews store no head commit of their own. `markers_stale` is true when the
PR's head differs from `pull_requests.last_reviewed_sha` (and there are
reviews): after a push the markers can point at shifted lines until the PR is
reviewed again.

## Split suggestion

- `total_lines` — all changed lines; `reviewable_lines` — core + wiring only.
- `too_big` when `reviewable_lines` > 400 (past that, defects found per line
  drop sharply; a regenerated lockfile is not review work).
- `proposed_splits` (only when too big): reviewable files grouped by top
  directory when the PR spans several, by feature folder (`modules/<x>`,
  `_components/<X>`…) inside one. Slices under 10 % fold into the largest,
  after its own files; at most 4 slices; files biggest first. Fewer than two
  slices → `[]` (no clean cut).

`pseudocode_summary` is always `null`: the endpoint stays free and instant.

The fields this homework added to the contract (`reason`, `findings`,
`reviewable_lines`, `reviews_used`, `markers_stale`) are nullish there, so the
design prototype's data still parses (`test/contracts.test.ts`); the endpoint
always fills them.

Tests: `test/smart-diff-helpers.test.ts`, `test/smart-diff.it.test.ts`.
