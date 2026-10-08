import type { SkillType } from '@devdigest/shared';

/**
 * Starter skills catalog. Seeded unlinked: linking one to an agent is a deliberate
 * choice in the Agent editor, so seeding never changes what existing reviews see.
 * Each body states when to flag, when not to, and how severe — the same structure
 * a reviewer agent's own prompt uses.
 */
export interface SeedSkill {
  name: string;
  description: string;
  type: SkillType;
  body: string;
}

export const SEED_SKILLS: SeedSkill[] = [
  {
    name: 'ssrf-outbound-requests',
    description: 'Flags server-side HTTP requests whose target URL comes from a user.',
    type: 'security',
    body: `# Outbound requests to user-controlled URLs

## Flag
- \`fetch\`, \`axios\`, \`got\`, \`http(s).request\` or a webhook call whose URL (or host, or path
  prefix) comes from a request body, query, header or a stored user setting.
- Validation that only checks the scheme or uses \`z.string()\` / \`z.string().url()\` — that
  still allows \`https://169.254.169.254/\`, \`https://localhost/\` and internal hostnames.
- Redirects followed without re-checking the new host.
- Responses or errors echoed back to the caller (turns blind SSRF into a data leak).

## Do not flag
- URLs built from constants or server configuration only.
- Requests that go through an allowlist of hosts, or a fetcher that resolves the host and
  refuses private, loopback and link-local addresses at connect time.

## Severity
CRITICAL when the request can carry credentials or internal data, or when the response
reaches the caller. WARNING for blind requests with no allowlist.`,
  },
  {
    name: 'query-efficiency',
    description: 'Flags N+1 queries, whole rows fetched to count them, and unbounded lists in Drizzle/Postgres code.',
    type: 'rubric',
    body: `# Query efficiency (Drizzle + Postgres)

## Flag
- A query inside a loop over rows from another query (N+1). Name the loop and the query.
- \`select()\` of whole rows only to read \`.length\` — use \`count(*)\` with \`GROUP BY\`.
- A list endpoint that returns every row with no limit or pagination.
- A bare \`count(*)\` in a \`sql<number>\` template without \`::int\`: Postgres returns bigint,
  postgres-js hands it over as a string, so the declared type lies.

## Do not flag
- Loops over a small fixed set (a handful of agents, settings keys).
- Missing indexes on tables the diff does not touch — out of scope for this PR.

## Severity
WARNING by default. CRITICAL only when the diff puts the N+1 on a hot path that every
request or every review run executes.`,
  },
  {
    name: 'fastify-route-contracts',
    description: 'Checks DevDigest Fastify routes for zod schemas, workspace scoping and thin handlers.',
    type: 'convention',
    body: `# Fastify route contracts

## Flag
- A route without zod \`params\` / \`body\` schemas, or a handler that calls
  \`Schema.parse(req.body)\` by hand.
- A query that reads or writes by id without the workspace from \`getContext()\` — that is a
  cross-tenant read or write.
- A missing record answered with 200 and \`null\` instead of a 404.
- A route that talks to an adapter or SDK directly instead of going through a service.
- An expensive route (model call, outbound fetch, clone) without a per-route rate limit.

## Do not flag
- Read-only list routes that already query Drizzle in the handler: existing drift, tracked
  by the architecture gate.

## Severity
CRITICAL for missing workspace scope. WARNING for the rest.`,
  },
  {
    name: 'null-not-zero',
    description: 'Flags code that turns unknown values (cost, score, counts) into 0 or an empty string.',
    type: 'convention',
    body: `# Unknown stays null

## Flag
- \`?? 0\`, \`|| 0\`, \`?? ''\` applied to a value that can genuinely be unknown — cost, score,
  tokens, timestamps — before it is stored or returned.
- UI that formats a missing number as \`$0.00\`, \`0%\` or \`0\` instead of a dash.
- Aggregates that count unknown members as zero (an average over nulls-as-zeros).

## Do not flag
- Counters that really start at zero (findings in a run, retries).

## Severity
WARNING. CRITICAL when the fake zero feeds a gate, a bill or a merge decision.`,
  },
];
