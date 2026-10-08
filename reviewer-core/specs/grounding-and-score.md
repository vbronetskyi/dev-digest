# Spec: grounding gate and score

The engine must never report a location the diff does not contain, and never
pass through a number the model made up.

## Grounding — `groundFindings(findings, diff)`

- A regular finding is **kept** only if its `[start_line, end_line]` range
  intersects a new-side line covered by a hunk of the **same file** in the diff.
- Otherwise it is **dropped** and returned with a reason, so the trace can show
  what was discarded.
- Full-file kinds — `secret_leak`, `lethal_trifecta`, `phantom`, `hook` — come from
  scanners that are not tied to a hunk. They only require the file to be present
  in the diff.
- `groundingSummary` renders `"kept/total passed"`, e.g. `"1/2 passed"`; this string
  is stored on the run and shown in the trace.

## Score — `scoreFromFindings(findings)`

Computed from the **grounded** findings only:

```
score = clamp(100 − 35·CRITICAL − 12·WARNING − 3·SUGGESTION, 0, 100)
```

| Example | Score |
|---|---|
| no findings | 100 |
| 1 CRITICAL | 65 |
| 1 CRITICAL + 3 WARNING | 29 |
| 3 CRITICAL | 0 (clamped) |

The model's own `score` field is ignored.

## Blockers — `countBlockers(findings, failOn)` (`src/output/to-review.ts`)

The number of grounded findings whose severity is at or above the agent's
`ciFailOn` threshold. The server stores it on the run, and the timeline colours
a run "rejected" when it is above zero — independent of the model's verdict.

## Severities

Exactly three, ordered `CRITICAL > WARNING > SUGGESTION`
(`Severity` in `@devdigest/shared`). There is no `INFO` level in the contract.
