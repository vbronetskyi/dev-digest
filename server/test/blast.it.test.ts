import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';
import { MockEmbedder, MockGitClient, MockGitHubClient, MockLLMProvider } from '../src/adapters/mocks.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;
const config = () => loadConfig({ ...process.env, NODE_ENV: 'test', REPO_INTEL_ENABLED: 'true' } as NodeJS.ProcessEnv);

// rateLimit() (lines 10-30) is changed; bucketKey() (40-50) in the same file is not.
const PATCH = '@@ -20,3 +20,4 @@\n   const key = bucketKey(req);\n+  if (!key) return reply.code(400).send();\n   await check(key);\n   next();';

let seq = 0;
d('HW L04 blast radius (Testcontainers pg)', () => {
  let pg: PgFixture;
  let app: FastifyInstance;
  let llm: MockLLMProvider;
  let workspaceId: string;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    workspaceId = (await pg.handle.db.select().from(t.workspaces))[0]!.id;
    llm = new MockLLMProvider('openai');
    app = await buildApp({
      config: config(),
      db: pg.handle.db,
      overrides: { embedder: new MockEmbedder(), git: new MockGitClient(), github: new MockGitHubClient({ pulls: [] }), llm: { openai: llm } },
    });
  }, 120_000);
  afterAll(async () => {
    await app?.close();
    await pg?.stop();
  });

  async function fixture(opts: { indexed: boolean; files: boolean }) {
    const db = pg.handle.db;
    const name = `api-${seq++}`;
    const [repo] = await db.insert(t.repos).values({ workspaceId, owner: 'acme', name, fullName: `acme/${name}` }).returning();
    const repoId = repo!.id;
    const [pr] = await db
      .insert(t.pullRequests)
      .values({ workspaceId, repoId, number: 1, title: 't', author: 'a', branch: 'b', base: 'main', headSha: 'h', status: 'needs_review' })
      .returning();
    if (opts.files) {
      await db.insert(t.prFiles).values({ prId: pr!.id, path: 'src/ratelimit.ts', additions: 1, deletions: 0, patch: PATCH });
    }
    if (opts.indexed) {
      await db.insert(t.repoIndexState).values({ repoId, lastIndexedSha: 'base123', indexerVersion: 2, status: 'full' });
      await db.insert(t.symbols).values([
        { repoId, path: 'src/ratelimit.ts', name: 'rateLimit', kind: 'function', line: 10, endLine: 30 },
        { repoId, path: 'src/ratelimit.ts', name: 'bucketKey', kind: 'function', line: 40, endLine: 50 },
        { repoId, path: 'src/api/public.ts', name: 'publicRouter', kind: 'function', line: 5, endLine: 40 },
        { repoId, path: 'src/jobs/reset.ts', name: 'resetBuckets', kind: 'function', line: 1, endLine: 20 },
      ]);
      await db.insert(t.references).values([
        { repoId, fromPath: 'src/api/public.ts', toSymbol: 'rateLimit', line: 23, declFile: 'src/ratelimit.ts' },
        { repoId, fromPath: 'src/jobs/reset.ts', toSymbol: 'bucketKey', line: 8, declFile: 'src/ratelimit.ts' },
      ]);
      await db.insert(t.fileRank).values([
        { repoId, filePath: 'src/api/public.ts', pagerank: 0.5, hotness: 0, rank: 0.5, percentile: 90 },
        { repoId, filePath: 'src/jobs/reset.ts', pagerank: 0.2, hotness: 0, rank: 0.2, percentile: 40 },
      ]);
      await db.insert(t.fileFacts).values([
        { repoId, filePath: 'src/api/public.ts', endpoints: ['GET /api/public/items', 'POST /api/public/webhooks'], crons: [] },
        { repoId, filePath: 'src/jobs/reset.ts', endpoints: [], crons: ['reset-buckets (hourly)'] },
      ]);
    }
    return pr!.id;
  }

  it('reports only the symbols the hunks touch, their callers and the endpoints behind them', async () => {
    const prId = await fixture({ indexed: true, files: true });
    llm.calls.length = 0;
    const res = await app.inject({ method: 'GET', url: `/pulls/${prId}/blast-radius` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.changed_symbols).toEqual([{ name: 'rateLimit', file: 'src/ratelimit.ts', kind: 'function', line: 10 }]);
    expect(body.downstream).toEqual([
      {
        symbol: 'rateLimit',
        callers: [{ name: 'publicRouter', file: 'src/api/public.ts', line: 23 }],
        endpoints_affected: ['GET /api/public/items', 'POST /api/public/webhooks'],
        crons_affected: [],
      },
    ]);
    expect(body.summary).toBe('1 symbol changed → 1 caller, 2 endpoints');
    expect(body.indexed_sha).toBe('base123');
    expect(body.degraded ?? null).toBeNull();
    expect(typeof body.duration_ms).toBe('number');
    // bucketKey's caller (a cron) is not in the radius: bucketKey itself did not change.
    expect(JSON.stringify(body)).not.toContain('reset-buckets');
    expect(llm.calls).toHaveLength(0);
  });

  it('says why when there is no index or no files, without scanning anything', async () => {
    const unindexed = await fixture({ indexed: false, files: true });
    expect((await app.inject({ method: 'GET', url: `/pulls/${unindexed}/blast-radius` })).json().degraded.reason).toBe('not_indexed');
    const noFiles = await fixture({ indexed: true, files: false });
    expect((await app.inject({ method: 'GET', url: `/pulls/${noFiles}/blast-radius` })).json().degraded.reason).toBe('no_files');
    expect((await app.inject({ method: 'GET', url: '/pulls/00000000-0000-0000-0000-000000000000/blast-radius' })).statusCode).toBe(404);
  });
});
