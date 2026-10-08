# Spec: Files changed tab — Smart Diff (HW L03)

Data: `useSmartDiff` → `GET /pulls/:id/smart-diff` (server spec:
`server/specs/smart-diff.md`). The query key is `["reviews", prId, "smart-diff"]`
on purpose: every place that invalidates `["reviews", prId]` (a run finished, a
finding accepted or rejected) refreshes the markers too.

- **Smart order** (default): sections Core logic → Wiring → Boilerplate, each
  with a one-line "how closely to read" and a file count. Boilerplate files
  start folded and say why they are there (`lockfile`, `test`, `entry point`…);
  wiring files carry the same note. A file with findings always starts open.
- **Original order**: the files as GitHub lists them. Finding markers stay;
  role notes and folding rules do not.
- **Finding markers**: a severity-coloured bar on every line a finding covers
  (worst severity wins), the finding title at the end of its first line ("+N"
  when several start there), and "N findings" in the file header.
- **Split banner** when `too_big`: reviewable vs total lines and the proposed
  slices (first four paths, "+N more"); "no clean cut" when there are none.
- The toolbar says where the markers come from ("latest review of each of N
  agents", or "no review yet"), and warns instead when `markers_stale` — the
  head moved since the last review, so lines may have shifted.
- When the endpoint fails the tab falls back to Original order with a note;
  a file the smart diff does not list is shown at the end of the last section,
  never dropped.

Tests: `DiffTab/DiffTab.test.tsx`, `src/components/diff-viewer/helpers.test.ts`.
