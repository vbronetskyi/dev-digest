# Spec: Skills Lab and the agent Skills tab

Server behaviour is in `server/specs/skills.md`; this file covers what the UI
promises.

## `/skills`

Two panes: the library (left) and the editor (right). State is in the URL:
`?skill=<id>` selects a skill, `?skill=new` opens the create form, `?tab=` is one
of `config | preview | stats | versions` (anything else falls back to `config`).
Nothing selected → "Select a skill".

**Library.** Search filters by name or description. Each card shows type, source,
how many agents link it and an enable toggle. A skill from an untrusted source
(`imported_url`, `community`) that is still disabled is marked **needs vetting**.
"Add Skill" offers *Import from URL* and *Create from scratch*.

**Config.** Name, description, type, body, enabled. The form validates with the
shared `SkillInput` schema before any request; Save is disabled while the form is
unchanged or invalid. The body field shows a rough token estimate (chars / 4)
and, once the body changes, which version saving will create. Untrusted skills
show a warning with the source URL. Delete asks for confirmation and unlinks the
skill everywhere.

**Preview.** *Rendered* Markdown, or *Prompt block* — the exact
`<skill name="…">` block the reviewer receives. `promptBlock` in
`src/app/skills/helpers.ts` mirrors `wrapSkill` in `reviewer-core/src/prompt.ts`;
change both together.

**Stats.** Agents linking the skill (each opens that agent's Skills tab), runs
whose prompt included it (any version) and the last time it was used.

**Versions.** Snapshots, newest first. Any older version can be viewed, diffed
line by line against the current body, or restored — restoring saves it as a new
version, history is never rewritten.

**Import from URL** (drawer). Step 1: URL → *Preview* (server fetches and parses,
nothing is saved). Step 2: source URL, warnings, editable name and type, the body
as fetched → *Import from URL*. The import sends the URL the server actually
fetched (`source_url`), so a GitHub page link and its raw file give the same
result. The new skill is disabled and gets selected.

## Agent editor — `/agents/:id?tab=skills`

- **Linked** — the agent's skills in prompt order, numbered. Untick to unlink.
  Reorder by dragging a row or with the up / down buttons (the keyboard path;
  the first row has no "up", the last no "down"). A linked skill that is
  disabled in the library is flagged: it will not reach the prompt.
- **Available** — the rest of the library with a filter. Tick to link; it goes
  to the end of the order.
- Every change sends the full ordered id list (`POST /agents/:id/skills`). The
  list updates optimistically and rolls back with a toast if the request fails.
- Empty library → a link to `/skills`.

## Trace drawer

Configuration lists `name@vN` for every skill the run was given
(`trace.config.skills`); each opens that skill's Versions tab in a new tab.
Older traces show "none".

## Import rule

Runtime zod schemas (`SkillInput`, `SkillName`) are imported from
`@/vendor/shared/contracts/knowledge`, not from the `@devdigest/shared` barrel:
a value import from the barrel breaks the Next build (`src/lib/feature-models.ts`).
Types can come from the barrel as usual.

## Tests

`src/lib/skills.test.ts`, `src/app/skills/helpers.test.ts`,
`SkillConfigForm.test.tsx`, `ImportSkillDrawer.test.tsx`,
`SkillsTab/helpers.test.ts`, `SkillsTab.test.tsx`, `RunTraceDrawer.test.tsx`.
