# Spec: conventions extractor

Finds a repository's house rules from its own code and lets a maintainer turn
each one into a `convention` skill. Module: `src/modules/conventions/`.

## Scan — `POST /repos/:id/conventions/extract`

Runs only on an explicit request (two paid model calls; 5 per minute).

1. **Candidates.** `repoIntel.getConventionSamples(repoId, 40)` — top-ranked files
   without tests, configs and migrations. Empty (repo not indexed, or repo-intel
   off) → `409 repo_not_indexed`.
2. **Model.** The workspace's Settings choice for `conventions`; otherwise the
   registry default (`FEATURE_MODELS`), and when that provider has no key,
   OpenRouter with `deepseek/deepseek-v4-flash`.
3. **Step 1 — `ConventionFileSelection`.** The model gets the candidate paths and
   picks up to 10. Only offered paths survive, at most 2 per folder. Nothing
   usable → the same rule applied to the candidates in rank order.
4. **Read.** The picked files are read from the local clone (8 000 chars each,
   60 000 total). Paths never come from the model's free text, only from the
   offered list.
5. **Step 2 — `ConventionExtraction`.** Files go in `<untrusted source="file:…">`
   blocks. Per convention the model returns `rule`, `evidence_path`,
   `evidence_snippet`, `also_seen_in`, `confidence`.
6. **Grounding.** A convention survives only if its file was read and its snippet
   is found there line by line (whitespace collapsed, blank lines skipped, at
   least 12 characters). The stored snippet is the file's own lines for that
   range, dedented, and `evidence_path` becomes `path:start-end` (`path:line` for
   one line). Duplicate rules are dropped. The rest count as `dropped`.
7. **Confidence** is the model's number capped by how many read files show the
   rule (cited file + `also_seen_in` paths that were read): 1 file → 0.6,
   2 → 0.8, 3+ → 1. The model alone rated everything 1.0.
8. **Store.** Pending candidates of the repo are replaced in one transaction;
   accepted ones stay. At most 8 per pass, strongest first.

Each model call has a 120 s deadline (`CALL_DEADLINE_MS`) → `502` with a message.
The deadline frees the request; it does not abort the provider call (see
`reviewer-core/insights` on the SDK timeout).

Response `ConventionExtraction`: `candidates` (everything stored for the repo),
`sampled_files`, `dropped`, `model`, `cost_usd` (sum of both calls; `null` if
either reported none).

## Review

| Endpoint | Behaviour |
|---|---|
| `GET /repos/:id/conventions` | stored candidates, accepted first, then by confidence |
| `POST /conventions/:id/accept {rule?, name?}` | creates the skill and marks the candidate accepted in one transaction (row locked) — `201` |
| `DELETE /conventions/:id` | reject = delete the candidate |

Accept details:

- Skill: `type: convention`, `source: extracted`, enabled, version 1,
  `evidence_files: [path]`. Body: the rule as a heading, what to flag and not to
  flag, severity (SUGGESTION, WARNING only if breaking it causes a bug), and the
  quoted example with its range.
- Name: the explicit `name` (409 if taken), or one derived from the rule (up to
  five meaningful words), suffixed `-2`, `-3`… until free.
- Accepting twice → `409 already_accepted`.

## Invariants

- No scan without a request; opening the page reads stored rows only.
- Every stored snippet exists verbatim (modulo indentation) at its stored range
  in the file as it was read.
- A model cannot make the server read a path it was not offered.

Tests: `test/conventions-helpers.test.ts`, `test/conventions.it.test.ts`.
