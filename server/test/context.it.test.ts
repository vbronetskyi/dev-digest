import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
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
const SPEC = '# Public API\n\nCallback URLs from a request MUST be allow-listed.';
const FILES = {
  'specs/public-api.md': SPEC,
  // 2 bytes per character in UTF-8: 150K characters are 300 KB.
  'docs/ukrainian.md': 'ї'.repeat(150_000),
  'docs/architecture.md': '# Architecture\n\nModules never import each other.',
  'server/insights/INSIGHTS.md': '# Insights',
  'specs/huge.md': 'x'.repeat(300_000),
  'README.md': '# Readme — not context',
};
const TWO_FILE_DIFF = [
  'diff --git a/src/a.ts b/src/a.ts', '--- a/src/a.ts', '+++ b/src/a.ts', '@@ -1,1 +1,2 @@', ' a', '+b',
  'diff --git a/src/b.ts b/src/b.ts', '--- a/src/b.ts', '+++ b/src/b.ts', '@@ -1,1 +1,2 @@', ' c', '+d',
].join('\n');

const userOf = (call: { req: unknown }) => (call.req as { messages: { content: string }[] }).messages.map((m) => m.content).join('\n');

let seq = 0;
d('L05 project context folder — SPEC-01 (Testcontainers pg)', () => {
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

  async function setup(opts: { noClone?: boolean; review?: unknown } = {}) {
    const llm = new MockLLMProvider('openai', { structured: opts.review ?? REVIEW, structuredBySchema: { PrIntent: { intent: 'i', in_scope: [], out_of_scope: [] } } });
    const git = new MockGitClient({ files: FILES, diff: TWO_FILE_DIFF, noClone: opts.noClone });
    const app = await buildApp({
      config: config(),
      db: pg.handle.db,
      overrides: { embedder: new MockEmbedder(), git, github: new MockGitHubClient({ pulls: [] }), llm: { openai: llm } },
    });
    const name = `ctx-${seq++}`;
    const [repo] = await pg.handle.db.insert(t.repos).values({ workspaceId, owner: 'acme', name, fullName: `acme/${name}` }).returning();
    const [pr] = await pg.handle.db
      .insert(t.pullRequests)
      .values({ workspaceId, repoId: repo!.id, number: 1, title: 'Share', author: 'a', branch: 'b', base: 'main', headSha: 'head1', status: 'needs_review' })
      .returning();
    const agent = async (extra: Record<string, unknown> = {}) =>
      (await app.inject({ method: 'POST', url: '/agents', payload: { name: `Sec ${seq++}`, provider: 'openai', model: 'gpt-4.1', system_prompt: 'sec', ...extra } })).json();
    const attach = (agentId: string, paths: string[]) => app.inject({ method: 'PUT', url: `/agents/${agentId}/context`, payload: { paths } });
    const review = async (agentId: string) => {
      const runId = (await app.inject({ method: 'POST', url: `/pulls/${pr!.id}/review`, payload: { agentId } })).json().runs[0].run_id;
      await waitForPrRuns(pg.handle.db, pr!.id, { expected: (await pg.handle.db.select().from(t.agentRuns).where(eq(t.agentRuns.prId, pr!.id))).length });
      return (await app.inject({ method: 'GET', url: `/runs/${runId}/trace` })).json();
    };
    const reviewCalls = () => llm.calls.filter((c) => (c.req as { schemaName?: string }).schemaName === 'Review');
    return { app, git, llm, repoId: repo!.id, agent, attach, review, reviewCalls };
  }

  it('AC-6/AC-7: stores attached paths in order without duplicates, and rejects bad ones whole', async () => {
    const { app, agent, attach } = await setup();
    const a = await agent();
    const ok = await attach(a.id, ['docs/architecture.md', 'specs/public-api.md', 'docs/architecture.md']);
    expect(ok.json()).toEqual({ paths: ['docs/architecture.md', 'specs/public-api.md'] });
    for (const bad of [['../secret.md'], ['/etc/x.md'], ['specs/notes.txt'], ['specs\\win.md'], [`specs/${'a'.repeat(300)}.md`], Array.from({ length: 21 }, (_, i) => `specs/${i}.md`)]) {
      expect((await attach(a.id, bad)).statusCode).toBe(422);
    }
    // A rejected request stores nothing: the earlier save is still there.
    expect((await app.inject({ method: 'GET', url: `/agents/${a.id}/context` })).json()).toEqual({ paths: ['docs/architecture.md', 'specs/public-api.md'] });
    // The extension is matched in any case.
    expect((await attach(a.id, ['docs/GUIDE.MD'])).json()).toEqual({ paths: ['docs/GUIDE.MD'] });
    await attach(a.id, ['docs/architecture.md', 'specs/public-api.md']);
    // 21 entries with one duplicate leave 20: accepted.
    const twenty = Array.from({ length: 20 }, (_, i) => `specs/${i}.md`);
    expect((await attach(a.id, [...twenty, 'specs/0.md'])).json().paths).toHaveLength(20);
    expect((await app.inject({ method: 'GET', url: `/agents/${a.id}/context` })).json().paths).toHaveLength(20);
    await app.close();
  });

  it('AC-1: lists specs/docs/insights Markdown with sizes and how many agents attach each', async () => {
    const { app, agent, attach, repoId } = await setup();
    await attach((await agent()).id, ['specs/public-api.md']);
    await attach((await agent()).id, ['specs/public-api.md', 'docs/architecture.md']);
    const list = (await app.inject({ method: 'GET', url: `/repos/${repoId}/context` })).json();
    expect(list.reason ?? null).toBeNull();
    expect(list.docs.map((x: { path: string; folder: string }) => `${x.folder}:${x.path}`)).toEqual([
      'specs:specs/huge.md',
      'specs:specs/public-api.md',
      'docs:docs/architecture.md',
      'docs:docs/ukrainian.md',
      'insights:server/insights/INSIGHTS.md',
    ]);
    const api = list.docs.find((x: { path: string }) => x.path === 'specs/public-api.md');
    expect(api).toMatchObject({ bytes: SPEC.length, tokens: Math.ceil(SPEC.length / 4) });
    expect(api.used_by).toBeGreaterThanOrEqual(2);
    await app.close();
  });

  it('AC-3: without a clone the list is empty with a reason, not an error', async () => {
    const { app, repoId } = await setup({ noClone: true });
    const res = await app.inject({ method: 'GET', url: `/repos/${repoId}/context` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ docs: [], reason: 'no_clone' });
    await app.close();
  });

  it('AC-4/AC-5: serves only listed documents, from the commit, cut at 256 KB', async () => {
    const { app, git, repoId } = await setup();
    const readFile = vi.spyOn(git, 'readFile');
    const file = (path: string) => app.inject({ method: 'GET', url: `/repos/${repoId}/context/file`, query: { path } });
    expect((await file('specs/public-api.md')).json()).toEqual({ path: 'specs/public-api.md', folder: 'specs', body: SPEC });
    expect((await file('README.md')).statusCode).toBe(404);
    expect((await file('../../etc/passwd')).statusCode).toBe(404);
    const huge = (await file('specs/huge.md')).json().body as string;
    expect(huge.length).toBeLessThan(300_000);
    expect(huge.endsWith('[… document cut at 256 KB]')).toBe(true);
    // Counted in bytes: 300 KB of two-byte characters is cut too, without splitting one.
    const ukr = (await file('docs/ukrainian.md')).json().body as string;
    const kept = ukr.slice(0, ukr.indexOf('\n\n[…'));
    expect(Buffer.byteLength(kept)).toBe(256 * 1024);
    expect(kept).toMatch(/^ї+$/);
    expect(readFile).not.toHaveBeenCalled();
    await app.close();
  });

  it('AC-8/AC-9/AC-12/AC-13/AC-14: a review puts the listed attached docs into every call, in order, and records them', async () => {
    const { git, agent, attach, review, reviewCalls } = await setup();
    const a = await agent({ strategy: 'map-reduce' });
    await attach(a.id, ['docs/architecture.md', 'specs/gone.md', 'README.md', 'specs/public-api.md']);
    const trace = await review(a.id);

    // Two files → two map calls; each carries the same documents, in the saved order.
    expect(reviewCalls()).toHaveLength(2);
    for (const call of reviewCalls()) {
      const user = userOf(call);
      expect(user).toContain('<untrusted source="spec-0">\nSource: docs/architecture.md');
      expect(user).toContain('<untrusted source="spec-1">\nSource: specs/public-api.md');
      expect(user).not.toContain('Readme — not context');
    }
    expect(trace.specs_read).toEqual(['docs/architecture.md', 'specs/public-api.md']);
    const log = trace.log.map((l: { msg: string }) => l.msg);
    expect(log).toContain('context: not in this repository — specs/gone.md, README.md');
    expect(log.some((m: string) => /^context: 2 document\(s\) from a1b2c3d, ≈\d+ tokens$/.test(m))).toBe(true);
    // AC-16: read through the commit, and only the listed paths.
    expect(git.reads).toEqual(expect.arrayContaining(['docs/architecture.md', 'specs/public-api.md']));
    expect(git.reads).not.toContain('specs/gone.md');
    expect(git.worktreeReads).toEqual([]);
  });

  it('AC-11: a document over the budget is cut and the next one left out, both logged', async () => {
    const { agent, attach, review, reviewCalls } = await setup();
    const a = await agent();
    await attach(a.id, ['specs/huge.md', 'specs/public-api.md']);
    const trace = await review(a.id);
    expect(trace.specs_read).toEqual(['specs/huge.md']);
    expect(trace.prompt_assembly.specs).toContain('[… cut at the project-context budget]');
    const log = trace.log.map((l: { msg: string }) => l.msg);
    expect(log).toContain('context: specs/huge.md cut at the budget');
    expect(log).toContain('context: left out, budget spent — specs/public-api.md');
    expect(userOf(reviewCalls()[0]!)).not.toContain('Source: specs/public-api.md');
  });

  it('AC-13: a failed run still records which documents were in the prompt', async () => {
    const { agent, attach, review } = await setup({ review: { nonsense: true } });
    const a = await agent();
    await attach(a.id, ['specs/public-api.md']);
    const trace = await review(a.id);
    expect(trace.log.some((l: { msg: string }) => l.msg.startsWith('Run failed'))).toBe(true);
    expect(trace.specs_read).toEqual(['specs/public-api.md']);
  });

  it('AC-17: an agent with nothing attached gets the prompt it had before', async () => {
    const { agent, review, reviewCalls } = await setup();
    const trace = await review((await agent()).id);
    expect(userOf(reviewCalls()[0]!)).not.toContain('## Project context');
    expect(trace.specs_read).toEqual([]);
    expect(trace.prompt_assembly.specs).toBeNull();
  });
});
