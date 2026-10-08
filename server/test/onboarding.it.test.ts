import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { StructuredRequest, StructuredResult } from '@devdigest/shared';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';
import { MockEmbedder, MockGitClient, MockGitHubClient, MockLLMProvider } from '../src/adapters/mocks.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;
const config = (flag = 'true') => loadConfig({ ...process.env, NODE_ENV: 'test', REPO_INTEL_ENABLED: flag } as NodeJS.ProcessEnv);

const FILES = {
  'package.json': JSON.stringify({ name: 'acme', scripts: { dev: 'turbo dev' } }),
  'server/package.json': JSON.stringify({ name: '@acme/api', scripts: { dev: 'tsx watch', test: 'vitest' }, dependencies: { fastify: '5' } }),
  'server/pnpm-lock.yaml': 'lockfileVersion: 9',
  'server/src/app.ts': 'export const app = 1;',
  'server/src/db.ts': 'export const db = 1;',
  'server/src/routes.ts': 'export const routes = 1;',
  'client/app/_components/Card/styles.ts': 'export const s = {};',
  'server/specs/api.md': '# API',
  'docker-compose.yml': 'services: {}',
};
const OUTPUT = (tag: string) => ({
  architecture: { body: `${tag}: a Fastify API.`, diagram: 'flowchart LR\n  A --> B' },
  critical_paths: { body: 'Chains.', notes: [{ path: 'server/src/app.ts', note: 'Boot.' }] },
  how_to_run: { body: 'Run `pnpm dev`.' },
  reading_path: { body: 'Start here.', notes: [{ path: 'server/src/db.ts', note: 'DB client.' }] },
  first_tasks: { body: '- Add a health route' },
});

/** Holds its first structured call until `release()` — a generation "in flight". */
class GatedLLM extends MockLLMProvider {
  release!: () => void;
  private gate = new Promise<void>((r) => (this.release = r));
  override async completeStructured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
    const res = super.completeStructured(req);
    await this.gate;
    return res;
  }
}

d('L05 onboarding generator — SPEC-02 (Testcontainers pg)', () => {
  let pg: PgFixture;
  let workspaceId: string;
  const apps: FastifyInstance[] = [];
  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    workspaceId = (await pg.handle.db.select().from(t.workspaces))[0]!.id;
  }, 120_000);
  afterAll(async () => {
    await Promise.all(apps.map((a) => a.close()));
    await pg?.stop();
  });

  async function appWith(llm: MockLLMProvider, git = new MockGitClient({ files: FILES }), flag = 'true') {
    const app = await buildApp({
      config: config(flag),
      db: pg.handle.db,
      overrides: { embedder: new MockEmbedder(), git, github: new MockGitHubClient({ pulls: [] }), llm: { openrouter: llm, openai: llm } },
    });
    apps.push(app);
    return app;
  }

  async function repo(opts: { indexed: boolean }) {
    const db = pg.handle.db;
    const name = `tour-${randomUUID().slice(0, 8)}`;
    const [row] = await db.insert(t.repos).values({ workspaceId, owner: 'acme', name, fullName: `acme/${name}` }).returning();
    const repoId = row!.id;
    if (opts.indexed) {
      await db.insert(t.repoIndexState).values({ repoId, lastIndexedSha: 'base123', indexerVersion: 2, status: 'full' });
      await db.insert(t.fileRank).values([
        { repoId, filePath: 'server/src/routes.ts', pagerank: 0.2, hotness: 0, rank: 0.2, percentile: 50 },
        { repoId, filePath: 'server/src/db.ts', pagerank: 0.5, hotness: 0, rank: 0.5, percentile: 99 },
        { repoId, filePath: 'server/src/app.ts', pagerank: 0.2, hotness: 0, rank: 0.2, percentile: 50 },
        // A leaf every component imports: top-ranked, but not where to start reading.
        { repoId, filePath: 'client/app/_components/Card/styles.ts', pagerank: 0.9, hotness: 0, rank: 0.9, percentile: 100 },
      ]);
      await db.insert(t.fileEdges).values([{ repoId, fromFile: 'server/src/db.ts', toFile: 'server/src/app.ts' }]);
      await db.insert(t.fileFacts).values([{ repoId, filePath: 'server/src/routes.ts', endpoints: ['GET /items'], crons: [] }]);
    }
    return repoId;
  }

  const tourCalls = (llm: MockLLMProvider) => llm.calls.filter((c) => (c.req as { schemaName?: string }).schemaName === 'OnboardingTour');

  it('AC-16: refuses to generate without a completed index, or with repo-intel off', async () => {
    const app = await appWith(new MockLLMProvider('openai', { structuredBySchema: { OnboardingTour: OUTPUT('x') } }));
    const unindexed = await repo({ indexed: false });
    const res = await app.inject({ method: 'POST', url: `/repos/${unindexed}/onboarding` });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.message).toMatch(/Index it first/);
    const off = await appWith(new MockLLMProvider('openai'), new MockGitClient({ files: FILES }), 'false');
    expect((await off.inject({ method: 'POST', url: `/repos/${await repo({ indexed: true })}/onboarding` })).statusCode).toBe(409);
  });

  it('AC-3/AC-5/AC-7/AC-9/AC-13/AC-18: one model call over facts, only package.json read, meta stored, GET free', async () => {
    const llm = new MockLLMProvider('openai', { structuredBySchema: { OnboardingTour: OUTPUT('first') } });
    const git = new MockGitClient({ files: FILES });
    const app = await appWith(llm, git);
    const repoId = await repo({ indexed: true });
    expect((await app.inject({ method: 'GET', url: `/repos/${repoId}/onboarding` })).json()).toEqual({ onboarding: null });

    const res = await app.inject({ method: 'POST', url: `/repos/${repoId}/onboarding` });
    expect(res.statusCode).toBe(200);
    const tour = res.json().onboarding;
    expect(tourCalls(llm)).toHaveLength(1);
    expect(tour.meta).toMatchObject({ source: 'model', model: 'deepseek/deepseek-v4-flash', cost_usd: 0.001, indexed_sha: 'base123', files_total: 9 });
    expect(git.reads.sort()).toEqual(['package.json', 'server/package.json']);

    const user = (tourCalls(llm)[0]!.req as { messages: { content: string }[] }).messages[1]!.content;
    expect(user).toContain('<untrusted source="facts">');
    for (const fact of ['"GET /items"', '"fastify"', '"pnpm"', '"docker-compose.yml"', '"server/specs/api.md"']) expect(user).toContain(fact);

    // Rank 0.5 first, then the two 0.2 files by path — never alphabetical overall,
    // and the higher-ranked styles module is left out (AC-9).
    const reading = tour.sections.find((s: { kind: string }) => s.kind === 'reading_path');
    expect(reading.links.map((l: { path: string }) => l.path)).toEqual(['server/src/db.ts', 'server/src/app.ts', 'server/src/routes.ts']);
    expect(reading.links[0].label).toBe('DB client.');

    const again = await app.inject({ method: 'GET', url: `/repos/${repoId}/onboarding` });
    expect(again.json().onboarding).toEqual(tour);
    expect(tourCalls(llm)).toHaveLength(1);
  });

  it('AC-14: a model that fails the schema leaves a skeleton tour with the reason and a null cost', async () => {
    const app = await appWith(new MockLLMProvider('openai', { structuredBySchema: { OnboardingTour: { nonsense: true } } }));
    const repoId = await repo({ indexed: true });
    const tour = (await app.inject({ method: 'POST', url: `/repos/${repoId}/onboarding` })).json().onboarding;
    expect(tour.meta).toMatchObject({ source: 'skeleton', model: null, cost_usd: null });
    expect(tour.meta.reason).toMatch(/schema/);
    expect(tour.sections).toHaveLength(5);
  });

  it('AC-15/AC-19: a successful regenerate replaces the tour; a failed one keeps the model-written tour', async () => {
    const repoId = await repo({ indexed: true });
    const good = await appWith(new MockLLMProvider('openai', { structuredBySchema: { OnboardingTour: OUTPUT('first') } }));
    await good.inject({ method: 'POST', url: `/repos/${repoId}/onboarding` });
    const better = await appWith(new MockLLMProvider('openai', { structuredBySchema: { OnboardingTour: OUTPUT('second') } }));
    const replaced = (await better.inject({ method: 'POST', url: `/repos/${repoId}/onboarding` })).json().onboarding;
    expect(replaced.sections[0].body).toBe('second: a Fastify API.');

    const broken = await appWith(new MockLLMProvider('openai', { structuredBySchema: { OnboardingTour: { nonsense: true } } }));
    const failed = await broken.inject({ method: 'POST', url: `/repos/${repoId}/onboarding` });
    expect(failed.statusCode).toBe(502);
    expect(failed.json().error.message).toMatch(/previous tour is kept/);
    const kept = (await broken.inject({ method: 'GET', url: `/repos/${repoId}/onboarding` })).json().onboarding;
    expect(kept.sections[0].body).toBe('second: a Fastify API.');
  });

  it('AC-17: refuses a second generation while one is running', async () => {
    const llm = new GatedLLM('openai', { structuredBySchema: { OnboardingTour: OUTPUT('gated') } });
    const app = await appWith(llm);
    const repoId = await repo({ indexed: true });
    const first = app.inject({ method: 'POST', url: `/repos/${repoId}/onboarding` });
    for (let i = 0; i < 50 && tourCalls(llm).length === 0; i++) await new Promise((r) => setTimeout(r, 20));
    expect((await app.inject({ method: 'POST', url: `/repos/${repoId}/onboarding` })).statusCode).toBe(409);
    llm.release();
    expect((await first).statusCode).toBe(200);
  });
});
