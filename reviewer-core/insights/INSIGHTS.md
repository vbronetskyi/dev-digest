# reviewer-core — insights

Notes the previous session left for this one. Append-only: add dated entries,
never rewrite old ones — supersede them with a new entry instead.

## What Works

## What Doesn't Work

### 2026-10-08 — `timeoutMs` does not bound a model call
`OpenRouterProvider` passes `timeout: 90_000` to the openai SDK, but the SDK only
times the request until response headers arrive; the body is read afterwards
with no limit. OpenRouter replies 200 immediately and holds the body open while
the model generates, so a stalled generation never times out, and the structured
retry loop never gets control back. Bounding the call needs an AbortSignal with a
total deadline passed to `chat.completions.create`.
Evidence: `src/llm/openrouter.ts:54`, `src/llm/openrouter.ts:68`

## Codebase Patterns

## Tool & Library Notes

## Recurring Errors & Fixes

## Session Notes

### 2026-10-08 — Homework 1: engine behaviour under real runs
No engine code changed. Traced a review stuck in "Reviewing all files in one
pass" for 11+ minutes to the SDK timeout scope above; documented the pipeline
and grounding/score rules in `docs/` and `specs/`.
Evidence: `src/llm/openrouter.ts:54`

## Open Questions
