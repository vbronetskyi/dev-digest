# client — `@devdigest/web`

Next.js 15 App Router studio on :3000: PR list, PR review detail, agents,
settings. Talks only to the Fastify API (`NEXT_PUBLIC_API_BASE`). Package
manager: **pnpm**.

## Commands

```sh
pnpm dev        # :3000, needs the API on :3001
pnpm typecheck
pnpm test       # vitest + jsdom, fetch mocked — no API or browser needed
```

## Map

- `src/app/**/page.tsx` — routes; pages stay thin and compose `_components/`.
- `src/app/**/_components/<Name>/` — feature components, colocated with their
  styles, constants, helpers and tests.
- `src/lib/hooks/<domain>.ts` — every TanStack Query hook; `src/lib/api.ts` — the
  only `fetch` wrapper.
- `src/components/` — app-level shared components (app shell, diff viewer,
  `cost-badge`).
- `src/lib/format-cost.ts` — the one USD formatter.
- `src/vendor/ui` (`@devdigest/ui`) — vendored UI kit: `Badge`, `Icon`, `Button`…
- `src/vendor/shared` (`@devdigest/shared`) — **client copy** of the zod contracts.
- `messages/en/<namespace>.json` — all UI text.

## Rules

- No `fetch` in components; add a hook in `src/lib/hooks/` and invalidate its
  query keys after mutations.
- Inline style objects live in `styles.ts` as `s.<name>`, typed with
  `satisfies CSSProperties` (or functions returning `CSSProperties`).
- Strings go through `useTranslations("<namespace>")`; tests wrap components in
  `NextIntlClientProvider` with the real message file.
- Use design tokens (`var(--crit)`, `var(--text-muted)`…) — never raw colours.
- A contract change starts in `server/src/vendor/shared`; copy the same edit
  here or the client types drift silently.

## Read when

- Adding a component, hook or deciding Server vs Client → `docs/ui-architecture.md`
- Changing a route or the data a page loads → `specs/pages.md`
- Rendering money / run cost → `specs/run-cost-display.md`
- Severity counts, filters or the PR list findings preview → `specs/findings-by-severity.md`
- Skills Lab (skills, conventions), the agent Skills tab or skills in the trace → `specs/skills-ui.md`
- The PR Overview blast radius card → `specs/blast-radius.md`
- Before any task in this package → `insights/INSIGHTS.md`
