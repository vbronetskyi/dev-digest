# Spec: browser flows

Each flow pins one user journey that must keep working. All of them run on
seeded data and make no model call.

| Flow | Guarantees |
|---|---|
| `01-app-boot` | `/` redirects to the first repo's PR list and the seeded PR #482 is visible |
| `02-repo-pulls-detail` | from the PR list, PR #482 opens its review detail route |
| `03-agents` | the agents page lists the seeded reviewer agents |
| `04-pr-findings` | PR #482 → Agent runs: the seeded run's verdict and findings render, and expanding one shows a `FindingCard` |
| `05-pr-diff` | PR #482 → Files changed: the seeded file renders in the diff viewer |
| `06-onboarding` | `/onboarding` renders the add-repository form (nothing is submitted) |
| `07-settings` | `/settings/api-keys` and `/settings/models` render their section titles |

## Rules for new flows

- One journey per file, named `NN-what-it-covers.flow.json`, numbered after the last.
- Assert on what the user sees (`--text`) or where they land (`--url`); no CSS
  selectors tied to styling.
- A flow that needs data must rely on the seed, not on a previous flow.
- If a UI change breaks a flow on purpose, update the flow in the same commit
  and this table if the guarantee changed.
