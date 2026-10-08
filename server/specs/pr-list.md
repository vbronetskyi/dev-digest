# Spec: PR list payload

`GET /repos/:id/pulls` returns one `PrMeta` per PR of the repo. Opening the list
syncs PRs from GitHub when a token is configured; without one it serves what is
persisted. Besides GitHub data, three fields are computed on read:

| Field | Meaning | `null` when |
|---|---|---|
| `score` | score of the **latest review** | never reviewed |
| `findings_by_severity` | `{ CRITICAL, WARNING, SUGGESTION }` counts of the latest review's findings | never reviewed |
| `cost_usd` | `SUM(cost_usd)` over the PR's `done` runs (see `run-cost.md`) | no costed successful run |

## "Latest review"

The newest `reviews` row with `kind = 'review'` for the PR, by `created_at`.
`summary` records never count. The client's hover preview picks the same record
from `GET /pulls/:id/reviews`, so the column and the preview always agree.

## Counting rules

- Counts are produced by Postgres: `COUNT(*) … GROUP BY review_id, severity`
  over the latest review ids, cast to `int` (a bare `count(*)` is `bigint`, which
  the driver returns as a string).
- Every finding of that review counts — accepted and dismissed too — because the
  run card on the PR page lists them all.
- A reviewed PR with no findings returns all-zero counts, not `null`; the UI shows
  "—" in both cases, but the API keeps "reviewed clean" and "not reviewed" apart.
- No LLM or GitHub call is made to compute any of these fields.

Covered by `test/reviews.it.test.ts` ("PR list reports the latest review's
findings by severity", "records run cost and sums it per PR").
