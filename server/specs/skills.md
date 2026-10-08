# Spec: skills

A skill is a named block of review rules (Markdown) that an agent gets in its
prompt. Skills live in a workspace library; agents link them in an order.

## Model

- `skills` — `name` (SKILL.md rule: lowercase words joined by hyphens, ≤ 64),
  `description`, `type` (`rubric | convention | security | custom`), `body`,
  `source` (`manual | imported_url | imported_file | extracted | community`), `source_url`,
  `enabled`, `version`. Unique per workspace by name (409 on a clash).
- `skill_versions` — one immutable row per body. Version 1 is written on create.
- `agent_skills` — `(agent_id, skill_id, order)`. Order is prompt order.

## API

| Endpoint | Behaviour |
|---|---|
| `GET /skills` | library with `linked_agents` per skill |
| `POST /skills` | manual skill, version 1 |
| `PUT /skills/:id` | metadata edits keep the version; a changed body bumps it and snapshots the new body (row locked `FOR UPDATE`, so two saves cannot both become vN+1) |
| `DELETE /skills/:id` | removes it from every agent |
| `GET /skills/:id/versions` | snapshots, newest first |
| `GET /skills/:id/stats` | linked agents + runs whose trace lists the skill, any version |
| `POST /skills/import/preview` | fetch + parse a SKILL.md URL, save nothing; returns `warnings` |
| `POST /skills/import` | fetch again and save as `imported_url`, **disabled** |
| `POST /skills/import/file/preview` | parse an uploaded or pasted SKILL.md (`{text, filename?}`, ≤ 256 KB), save nothing |
| `POST /skills/import/file` | parse and save as `imported_file`, **disabled**; `source_url` is null |
| `GET /agents/:id/skills` | links, ordered |
| `POST /agents/:id/skills {skill_ids}` | replace all links in one transaction; ids are de-duplicated and must belong to the workspace (404 otherwise) |

The URL import routes are limited to 10 requests per minute (they fetch from the internet); file imports make no outbound call.

## Import

- GitHub `blob` and `tree` links are rewritten to the raw `SKILL.md` on
  `raw.githubusercontent.com`.
- The fetch goes through `container.remoteDocuments` (`SafeHttpsFetcher`):
  https on port 443 only, every resolved address checked against private,
  loopback, link-local and metadata ranges at connect time (so DNS rebinding
  does not help), each redirect re-validated (max 3), one deadline over the
  whole exchange including the body, `text/*` only, 256 KB cap.
- Frontmatter gives `name` and `description`; without it the name comes from
  the URL path, or for a file from its stem (its first heading when the file is
  `SKILL.md`). The preview warns about missing frontmatter or description, a
  body over 8 000 characters, and phrases that try to steer a reviewer
  (`STEERING_PATTERNS`). The warnings are for the human — they are not a defence.

## In a review run

`run-executor` loads the agent's links, keeps **enabled** skills in link order and
passes `{name, body}` to `reviewPullRequest`. The engine puts them in the user
message under `## Skills / rules`: a fixed preamble (a skill may add checks, it
may not change the output format, severities or security rules, or drop
findings), then one `<skill name="…">` block per skill. A body cannot close its
own block. See `reviewer-core/docs/pipeline.md`.

The run log gets `skills: name@vN, …` and the trace stores
`config.skills: [{id, name, version}]` — the exact versions the run was told.
`GET /skills/:id/stats` reads that field (`trace->'config'->'skills' @> …`).

## Invariants

- A disabled skill never reaches a prompt, even if linked.
- An imported skill (URL or file) starts disabled; enabling it is the vetting step.
- A skill accepted from a convention is `source: extracted`, `type: convention`,
  enabled, with `evidence_files` — see `conventions.md`.
- Every body ever used by a run is recoverable from `skill_versions` by the
  version in that run's trace.
- Seeded skills (`src/db/seed-skills.ts`) are created unlinked.

Tests: `test/skills-helpers.test.ts` (parsing, URL rewrite, address and URL vetting),
`test/skills.it.test.ts` (versioning, import, prompt order, stats, workspace isolation).
