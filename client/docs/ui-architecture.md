# UI architecture

## Server and Client Components

- `src/app/layout.tsx` is a **Server Component**. It resolves the locale and
  messages with `next-intl/server`, sets the theme before paint, and wraps the app
  in `NextIntlClientProvider` and `Providers` (`src/lib/providers.tsx`: TanStack
  Query client, theme, toasts, active-repo context).
- Every page and feature component that holds state, reads the URL or fetches
  data starts with `"use client"`. Data never comes from server-side `fetch`
  in this app: the API is local and changes while you look at it (runs stream in),
  so everything is client-fetched and kept fresh by TanStack Query.
- Server Components are therefore limited to layout-level concerns. Do not add
  server data loading to a page without a reason that outweighs live updates.

## Data flow

```
component → use<Thing>() hook (src/lib/hooks/<domain>.ts)
          → api.<method>() / apiFetch (src/lib/api.ts)
          → Fastify API
```

- `apiFetch` prefixes `API_BASE`, parses JSON and throws `ApiError`
  (`message`, `status`, `code`) built from the server's error envelope; a network
  failure becomes `code: "network_error"`. Components show `error.message`.
- Query keys are plain arrays: `["reviews", prId]`, `["pr-runs", prId]`,
  `["pr-active-runs", prId]`… Mutations invalidate the keys they affect
  (deleting a run invalidates both `pr-runs` and `reviews`).
- Live runs: `usePrActiveRuns` polls every 4 s while something is running;
  `useRunEvents` opens one `EventSource` per run on `/runs/:id/events` for the
  live log, and the PR page refetches reviews when a run finishes.

## URL state

PR detail keeps UI state in the query string so it survives reload and can be
linked: `?tab=overview|findings|diff` (the "Agent runs" tab is `findings`) and
`?trace=<runId>` for the open trace drawer.

## Component layout

```
_components/ReviewRunAccordion/
  ReviewRunAccordion.tsx   # the component, default + named export
  index.ts                 # re-export
  styles.ts                # export const s = { … } satisfies CSSProperties
  constants.ts             # UPPER_SNAKE_CASE values
  helpers.ts               # pure functions, unit-testable
  ReviewRunAccordion.test.tsx
```

Pure logic (sorting, filtering, counting, formatting) goes to `helpers.ts` or
`src/lib/` so it is testable without rendering.

## Styling and text

- Styles are inline objects over CSS variables from the vendored UI kit
  (`src/vendor/ui/styles.css`): `--crit`, `--warn`, `--sugg`, `--ok`,
  `--text-muted`… plus utility classes `.mono` and `.tnum`.
- Severity colours are `--crit` (CRITICAL), `--warn` (WARNING), `--sugg`
  (SUGGESTION).
- All visible text lives in `messages/en/<namespace>.json`; components read it
  with `useTranslations`. ICU plurals are used for counts.
