# reviewer-core — `@devdigest/reviewer-core`

The pure review engine: diff + agent inputs → prompt → LLM → grounded findings.
The server imports its TypeScript source through a path alias; nothing is built
or published. Package manager: **npm** (`package-lock.json`).

## Commands

```sh
npm run typecheck   # also the "build"
npm test            # vitest, stubbed LLMProvider — no keys, no network
```

## Map

- `src/review/run.ts` — `reviewPullRequest()`: the entry point and strategy choice.
- `src/review/reduce.ts` — merging partial reviews, `scoreFromFindings`.
- `src/output/to-review.ts` — `countBlockers` and the CI review payload (`toReview`).
- `src/prompt.ts` — `assemblePrompt`, `wrapUntrusted`, `INJECTION_GUARD`.
- `src/grounding.ts` — the citation gate.
- `src/llm/openrouter.ts` — the OpenRouter provider (cost from `usage.cost`).
- `src/llm/structured.ts` — zod → JSON Schema, parse-with-repair.
- Contracts come from `../server/src/vendor/shared` via the `@devdigest/shared` alias.

## Rules

- No I/O except the injected `LLMProvider`: no DB, filesystem, env, GitHub,
  `fetch`. Callers resolve skills, memory and specs into strings first.
- Untrusted text (diff, PR body, specs) is always wrapped by `wrapUntrusted` and
  covered by `INJECTION_GUARD`. Never keyword-scan it as a defence.
- Never trust the model's score or locations: grounding and
  `scoreFromFindings` decide.
- Run `npm`, never `pnpm install`, in this package.

## Read when

- Changing prompt assembly, strategies or cost aggregation → `docs/pipeline.md`
- Changing grounding, severity penalties or blockers → `specs/grounding-and-score.md`
- Before any task in this package → `insights/INSIGHTS.md`
