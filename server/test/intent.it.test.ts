import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Review } from '@devdigest/shared';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { waitForPrRuns } from './helpers/runs.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';
import { MockEmbedder, MockGitClient, MockGitHubClient, MockLLMProvider } from '../src/adapters/mocks.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;
const config = () => loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);

const REVIEW: Review = { verdict: 'approve', summary: 'ok', score: 100, findings: [] };
const INTENT = { intent: 'Let users forward a finished review to their own webhook', in_scope: ['POST /reviews/:id/share'], out_of_scope: ['Retries'] };

let seq = 0;
d('L03 intent layer (Testcontainers pg)', () => {
  let pg: PgFixture;
  let workspaceId: string;
  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    workspaceId = (await pg.handle.db.select().from(t.workspaces))[0]!.id;
  }, 120_000);
  afterAll(async () => {
    await pg?.stop();
  });

  async function setup(intentFixture: unknown) {
    const llm = new MockLLMProvider('openai', { structured: REVIEW, structuredBySchema: { PrIntent: intentFixture } });
    const app = await buildApp({
      config: config(),
      db: pg.handle.db,
      overrides: { embedder: new MockEmbedder(), git: new MockGitClient(), github: new MockGitHubClient({ pulls: [] }), llm: { openai: llm } },
    });
    const name = `api-${seq++}`;
    const [repo] = await pg.handle.db.insert(t.repos).values({ workspaceId, owner: 'acme', name, fullName: `acme/${name}` }).returning();
    const [pr] = await pg.handle.db
      .insert(t.pullRequests)
      .values({ workspaceId, repoId: repo!.id, number: 3, title: 'Share reviews', author: 'a', branch: 'b', base: 'main', headSha: 'head1', status: 'needs_review', body: 'Adds a share endpoint.' })
      .returning();
    const agent = (await app.inject({ method: 'POST', url: '/agents', payload: { name: `Sec ${seq}`, provider: 'openai', model: 'gpt-4.1', system_prompt: 'sec' } })).json();
    const review = async () => {
      const runId = (await app.inject({ method: 'POST', url: `/pulls/${pr!.id}/review`, payload: { agentId: agent.id } })).json().runs[0].run_id;
      await waitForPrRuns(pg.handle.db, pr!.id, { expected: (await pg.handle.db.select().from(t.agentRuns).where(eq(t.agentRuns.prId, pr!.id))).length });
      return (await app.inject({ method: 'GET', url: `/runs/${runId}/trace` })).json();
    };
    const intentCalls = () => llm.calls.filter((c) => (c.req as { schemaName?: string }).schemaName === 'PrIntent').length;
    return { app, pr: pr!, review, intentCalls };
  }

  it('GET is free and null until derived; POST derives for the current head', async () => {
    const { app, pr, intentCalls } = await setup(INTENT);
    expect((await app.inject({ method: 'GET', url: `/pulls/${pr.id}/intent` })).json()).toEqual({ intent: null });
    const res = await app.inject({ method: 'POST', url: `/pulls/${pr.id}/intent` });
    expect(res.statusCode).toBe(200);
    expect(res.json().intent).toMatchObject({ ...INTENT, pr_id: pr.id, head_sha: 'head1', model: 'gpt-4.1', cost_usd: 0.001 });
    expect((await app.inject({ method: 'GET', url: `/pulls/${pr.id}/intent` })).json().intent.intent).toBe(INTENT.intent);
    expect(intentCalls()).toBe(1);
    await app.close();
  });

  it('a review derives the intent once per head and hands it to the reviewer as untrusted text', async () => {
    const { app, pr, review, intentCalls } = await setup(INTENT);
    const first = await review();
    expect(first.prompt_assembly.intent).toContain('<untrusted source="intent">\nIntent: Let users forward');
    expect(first.log.map((l: { msg: string }) => l.msg)).toContain('intent: derived with gpt-4.1 ($0.00100)');

    const second = await review();
    expect(second.log.map((l: { msg: string }) => l.msg)).toContain('intent: cached for head1');
    expect(intentCalls()).toBe(1);

    // A new head makes the stored intent stale: the next review derives again.
    await pg.handle.db.update(t.pullRequests).set({ headSha: 'head2' }).where(eq(t.pullRequests.id, pr.id));
    await review();
    expect(intentCalls()).toBe(2);
    await app.close();
  });

  it('a failed derivation never fails the review', async () => {
    const { app, review } = await setup({ nonsense: true });
    const trace = await review();
    expect(trace.prompt_assembly.intent ?? null).toBeNull();
    expect(trace.log.some((l: { msg: string }) => l.msg.startsWith('intent: unavailable'))).toBe(true);
    expect(trace.stats.findings).toBe(0);
    await app.close();
  });
});
