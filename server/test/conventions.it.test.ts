import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { ChatMessage, ConventionCandidate, ConventionExtraction } from '@devdigest/shared';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';
import type { RepoIntel } from '../src/modules/repo-intel/types.js';
import { MockEmbedder, MockGitClient, MockGitHubClient, MockLLMProvider } from '../src/adapters/mocks.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;
const config = () => loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);

const ROUTES_TS = [
  "app.get('/skills', async (req) => {",
  '  const { workspaceId } = await getContext(app.container, req);',
  '  return service.list(workspaceId);',
  '});',
].join('\n');
const QUOTE = 'const { workspaceId } = await getContext(app.container, req);';

d('L02 conventions extractor (Testcontainers pg)', () => {
  let pg: PgFixture;
  let app: FastifyInstance;
  let llm: MockLLMProvider;
  let repoId: string;
  let samples: string[] = ['src/routes.ts', 'src/service.ts'];
  const fixtures: Record<string, unknown> = {};

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    const [repo] = await pg.handle.db.select().from(t.repos).where(eq(t.repos.fullName, 'acme/payments-api'));
    repoId = repo!.id;
    llm = new MockLLMProvider('openai', { structuredBySchema: fixtures });
    const repoIntel = { getConventionSamples: async () => samples } as unknown as RepoIntel;
    app = await buildApp({
      config: config(),
      db: pg.handle.db,
      overrides: {
        embedder: new MockEmbedder(),
        git: new MockGitClient({ files: { 'src/routes.ts': ROUTES_TS } }),
        github: new MockGitHubClient({ pulls: [] }),
        llm: { openai: llm },
        repoIntel,
      },
    });
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await pg?.stop();
  });

  const extract = () => app.inject({ method: 'POST', url: `/repos/${repoId}/conventions/extract` });

  it('reads only offered files and keeps only conventions that quote them', async () => {
    fixtures.ConventionFileSelection = { files: ['src/routes.ts', '../../etc/passwd'] };
    fixtures.ConventionExtraction = {
      conventions: [
        { rule: 'Scope every handler with getContext', evidence_path: 'src/routes.ts', evidence_snippet: QUOTE, also_seen_in: ['src/service.ts'], confidence: 0.9 },
        { rule: 'Invented rule', evidence_path: 'src/routes.ts', evidence_snippet: 'await authorize(req);', also_seen_in: [], confidence: 0.8 },
      ],
    };
    const before = await app.inject({ method: 'GET', url: `/repos/${repoId}/conventions` });
    expect(before.json()).toEqual([]);

    llm.calls.length = 0;
    const res = await extract();
    expect(res.statusCode).toBe(200);
    const body = res.json() as ConventionExtraction;
    expect(body.sampled_files).toEqual(['src/routes.ts']);
    expect(body.dropped).toBe(1);
    expect(body.cost_usd).toBeCloseTo(0.002);
    expect(body.candidates).toMatchObject([
      { rule: 'Scope every handler with getContext', evidence_path: 'src/routes.ts:2', evidence_snippet: QUOTE, confidence: 0.6, accepted: false },
    ]);

    const [, second] = llm.calls.map((c) => c.req as { messages: ChatMessage[] });
    expect(second!.messages[1]!.content).toContain('<untrusted source="file:src/routes.ts">');
  });

  it('accepts a candidate as an enabled convention skill, exactly once', async () => {
    const [candidate] = (await app.inject({ method: 'GET', url: `/repos/${repoId}/conventions` })).json() as ConventionCandidate[];
    const accepted = await app.inject({ method: 'POST', url: `/conventions/${candidate!.id}/accept`, payload: {} });
    expect(accepted.statusCode).toBe(201);
    const { skill_id, skill_name, convention } = accepted.json();
    expect(skill_name).toBe('scope-handler-getcontext');
    expect(convention.accepted).toBe(true);

    const skill = (await app.inject({ method: 'GET', url: `/skills/${skill_id}` })).json();
    expect(skill).toMatchObject({ type: 'convention', source: 'extracted', enabled: true, version: 1, evidence_files: ['src/routes.ts'] });
    expect(skill.body).toContain(QUOTE);
    const versions = (await app.inject({ method: 'GET', url: `/skills/${skill_id}/versions` })).json();
    expect(versions).toHaveLength(1);

    const again = await app.inject({ method: 'POST', url: `/conventions/${candidate!.id}/accept`, payload: {} });
    expect(again.statusCode).toBe(409);
  });

  it('a re-scan replaces pending candidates and keeps accepted ones', async () => {
    fixtures.ConventionExtraction = {
      conventions: [
        { rule: 'Return the service result directly', evidence_path: 'src/routes.ts', evidence_snippet: 'return service.list(workspaceId);', also_seen_in: [], confidence: 0.7 },
      ],
    };
    const res = await extract();
    const rules = (res.json() as ConventionExtraction).candidates.map((c) => [c.rule, c.accepted]);
    expect(rules).toEqual([
      ['Scope every handler with getContext', true],
      ['Return the service result directly', false],
    ]);
  });

  it('"Edit first" overrides the rule and the name; a taken name is a 409', async () => {
    const list = (await app.inject({ method: 'GET', url: `/repos/${repoId}/conventions` })).json() as ConventionCandidate[];
    const pending = list.find((c) => !c.accepted)!;

    const taken = await app.inject({ method: 'POST', url: `/conventions/${pending.id}/accept`, payload: { name: 'scope-handler-getcontext' } });
    expect(taken.statusCode).toBe(409);

    const edited = await app.inject({
      method: 'POST',
      url: `/conventions/${pending.id}/accept`,
      payload: { rule: 'Handlers return what the service returns', name: 'thin-handlers' },
    });
    expect(edited.statusCode).toBe(201);
    const skill = (await app.inject({ method: 'GET', url: `/skills/${edited.json().skill_id}` })).json();
    expect(skill.name).toBe('thin-handlers');
    expect(skill.body.startsWith('# Handlers return what the service returns')).toBe(true);
  });

  it('rejects by deleting, and refuses to scan an unindexed repo', async () => {
    fixtures.ConventionExtraction = {
      conventions: [{ rule: 'Something to reject', evidence_path: 'src/routes.ts', evidence_snippet: QUOTE, also_seen_in: [], confidence: 0.5 }],
    };
    const pending = ((await extract()).json() as ConventionExtraction).candidates.find((c) => !c.accepted)!;
    expect((await app.inject({ method: 'DELETE', url: `/conventions/${pending.id}` })).json()).toEqual({ ok: true });
    expect((await app.inject({ method: 'DELETE', url: `/conventions/${pending.id}` })).statusCode).toBe(404);
    const left = await pg.handle.db
      .select()
      .from(t.conventions)
      .where(and(eq(t.conventions.repoId, repoId), eq(t.conventions.accepted, false)));
    expect(left).toHaveLength(0);

    samples = [];
    const unindexed = await extract();
    expect(unindexed.statusCode).toBe(409);
    expect(unindexed.json().error.code).toBe('repo_not_indexed');
  });
});
