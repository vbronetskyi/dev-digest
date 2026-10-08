import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Review } from '@devdigest/shared';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { waitForPrRuns } from './helpers/runs.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';
import {
  MockEmbedder,
  MockGitClient,
  MockGitHubClient,
  MockLLMProvider,
  MockRemoteDocumentFetcher,
} from '../src/adapters/mocks.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;
const config = () => loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);

const DIFF = `diff --git a/src/config.ts b/src/config.ts
--- a/src/config.ts
+++ b/src/config.ts
@@ -10,3 +10,4 @@
   port: 3000,
+  stripeKey: "sk_live_xxx",
   redisUrl: x,`;

const REVIEW: Review = { verdict: 'approve', summary: 'Nothing to report.', score: 100, findings: [] };

const RAW_URL = 'https://raw.githubusercontent.com/acme/skills/main/api-conventions/SKILL.md';
const SKILL_MD = '---\nname: api-conventions\ndescription: Route naming rules.\n---\nUse kebab-case paths.';

d('L02 skills (Testcontainers pg)', () => {
  let pg: PgFixture;
  let workspaceId: string;
  let llm: MockLLMProvider;
  let fetcher: MockRemoteDocumentFetcher;
  let app: FastifyInstance;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    const [ws] = await pg.handle.db.select().from(t.workspaces);
    workspaceId = ws!.id;
    llm = new MockLLMProvider('openai', { structured: REVIEW });
    fetcher = new MockRemoteDocumentFetcher({ [RAW_URL]: SKILL_MD });
    app = await buildApp({
      config: config(),
      db: pg.handle.db,
      overrides: {
        embedder: new MockEmbedder(),
        git: new MockGitClient({ diff: DIFF }),
        github: new MockGitHubClient({ pulls: [] }),
        llm: { openai: llm },
        remoteDocuments: fetcher,
      },
    });
  });
  afterAll(async () => {
    await app?.close();
    await pg?.stop();
  });

  const create = (payload: Record<string, unknown>) => app.inject({ method: 'POST', url: '/skills', payload });

  it('versions the body, not the metadata, and guards names', async () => {
    const res = await create({ name: 'review-tone', description: 'Tone rules.', type: 'custom', body: 'Be direct.' });
    expect(res.statusCode).toBe(201);
    const skill = res.json();
    expect(skill).toMatchObject({ version: 1, source: 'manual', source_url: null });

    const meta = await app.inject({ method: 'PUT', url: `/skills/${skill.id}`, payload: { description: 'Tone.' } });
    expect(meta.json().version).toBe(1);

    const body = await app.inject({ method: 'PUT', url: `/skills/${skill.id}`, payload: { body: 'Be direct and kind.' } });
    expect(body.json().version).toBe(2);

    const versions = (await app.inject({ method: 'GET', url: `/skills/${skill.id}/versions` })).json();
    expect(versions.map((v: { version: number }) => v.version)).toEqual([2, 1]);
    expect(versions[1].body).toBe('Be direct.');

    expect((await create({ name: 'review-tone', description: 'x', type: 'custom', body: 'y' })).statusCode).toBe(409);
    expect((await create({ name: 'Review Tone', description: 'x', type: 'custom', body: 'y' })).statusCode).toBe(422);

    expect((await app.inject({ method: 'DELETE', url: `/skills/${skill.id}` })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/skills/${skill.id}` })).statusCode).toBe(404);
  });

  it('previews then imports a SKILL.md, rewriting a GitHub page link to raw', async () => {
    const pageUrl = 'https://github.com/acme/skills/blob/main/api-conventions/SKILL.md';
    const preview = await app.inject({ method: 'POST', url: '/skills/import/preview', payload: { url: pageUrl } });
    expect(preview.statusCode).toBe(200);
    expect(preview.json()).toMatchObject({ name: 'api-conventions', description: 'Route naming rules.', source_url: RAW_URL, warnings: [] });
    expect(await pg.handle.db.select().from(t.skills).where(eq(t.skills.name, 'api-conventions'))).toHaveLength(0);

    const imported = await app.inject({ method: 'POST', url: '/skills/import', payload: { url: pageUrl, type: 'convention' } });
    expect(imported.statusCode).toBe(201);
    // Imported skills stay disabled until a human vets and enables them.
    expect(imported.json()).toMatchObject({ source: 'imported_url', source_url: RAW_URL, type: 'convention', body: 'Use kebab-case paths.', enabled: false });

    const filePreview = await app.inject({ method: 'POST', url: '/skills/import/file/preview', payload: { text: SKILL_MD.replace('api-conventions', 'file-conventions'), filename: 'x.md' } });
    expect(filePreview.json()).toMatchObject({ name: 'file-conventions', source_url: null, warnings: [] });
    const fromFile = await app.inject({ method: 'POST', url: '/skills/import/file', payload: { text: SKILL_MD.replace('api-conventions', 'file-conventions'), type: 'rubric' } });
    expect(fromFile.statusCode).toBe(201);
    expect(fromFile.json()).toMatchObject({ name: 'file-conventions', source: 'imported_file', source_url: null, type: 'rubric', enabled: false });

    const missing = await app.inject({ method: 'POST', url: '/skills/import/preview', payload: { url: 'https://example.com/nope.md' } });
    expect(missing.statusCode).toBe(422);
    expect(missing.json().error.message).toMatch(/HTTP 404/);
  });

  it('puts linked, enabled skills into the prompt in order and records them in the trace', async () => {
    const a = (await create({ name: 'skill-alpha', description: 'a', type: 'rubric', body: 'ALPHA RULE' })).json();
    const b = (await create({ name: 'skill-bravo', description: 'b', type: 'rubric', body: 'BRAVO RULE' })).json();
    const off = (await create({ name: 'skill-off', description: 'c', type: 'rubric', body: 'OFF RULE', enabled: false })).json();
    const agent = (
      await app.inject({ method: 'POST', url: '/agents', payload: { name: 'Skilled', provider: 'openai', model: 'gpt-4.1', system_prompt: 'review' } })
    ).json();

    // Duplicates collapse; order is the order given.
    const linked = await app.inject({ method: 'POST', url: `/agents/${agent.id}/skills`, payload: { skill_ids: [b.id, a.id, off.id, b.id] } });
    expect(linked.json().map((l: { skill_id: string }) => l.skill_id)).toEqual([b.id, a.id, off.id]);

    const [repo] = await pg.handle.db.insert(t.repos).values({ workspaceId, owner: 'acme', name: 'skills-demo', fullName: 'acme/skills-demo' }).returning();
    const [pr] = await pg.handle.db
      .insert(t.pullRequests)
      .values({ workspaceId, repoId: repo!.id, number: 7, title: 'Add key', author: 'x', branch: 'f', base: 'main', headSha: 'abc', additions: 1, deletions: 0, filesCount: 1, status: 'needs_review' })
      .returning();
    const before = llm.calls.length;
    const res = await app.inject({ method: 'POST', url: `/pulls/${pr!.id}/review`, payload: { agentId: agent.id } });
    const runId = res.json().runs[0].run_id;
    await waitForPrRuns(pg.handle.db, pr!.id, { expected: 1 });

    // The reviewer's call, not the intent call (L03) that precedes it.
    const call = llm.calls
      .slice(before)
      .find((c) => c.method === 'completeStructured' && (c.req as { schemaName?: string }).schemaName !== 'PrIntent')!;
    const user = (call.req as { messages: { role: string; content: string }[] }).messages.find((m) => m.role === 'user')!.content;
    expect(user.indexOf('<skill name="skill-bravo">')).toBeGreaterThan(-1);
    expect(user.indexOf('<skill name="skill-alpha">')).toBeGreaterThan(user.indexOf('<skill name="skill-bravo">'));
    expect(user).not.toContain('OFF RULE');

    const trace = (await app.inject({ method: 'GET', url: `/runs/${runId}/trace` })).json();
    expect(trace.config.skills).toEqual([
      { id: b.id, name: 'skill-bravo', version: 1 },
      { id: a.id, name: 'skill-alpha', version: 1 },
    ]);
    expect(trace.prompt_assembly.skills).toContain('ALPHA RULE');

    const stats = (await app.inject({ method: 'GET', url: `/skills/${a.id}/stats` })).json();
    expect(stats.runs_used).toBe(1);
    expect(stats.last_used_at).not.toBeNull();
    expect(stats.linked_agents).toEqual([{ id: agent.id, name: 'Skilled' }]);
    const offStats = (await app.inject({ method: 'GET', url: `/skills/${off.id}/stats` })).json();
    expect(offStats.runs_used).toBe(0);
  });

  it('refuses to link a skill from another workspace', async () => {
    const [other] = await pg.handle.db.insert(t.workspaces).values({ name: 'other-team' }).returning();
    const [foreign] = await pg.handle.db
      .insert(t.skills)
      .values({ workspaceId: other!.id, name: 'foreign', description: 'f', type: 'custom', source: 'manual', body: 'x' })
      .returning();
    const agent = (
      await app.inject({ method: 'POST', url: '/agents', payload: { name: 'Isolated', provider: 'openai', model: 'gpt-4.1', system_prompt: 'review' } })
    ).json();
    const res = await app.inject({ method: 'POST', url: `/agents/${agent.id}/skills`, payload: { skill_ids: [foreign!.id] } });
    expect(res.statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/agents/${agent.id}/skills` })).json()).toEqual([]);
  });

  it('seeds the starter catalog unlinked', async () => {
    const list = (await app.inject({ method: 'GET', url: '/skills' })).json();
    const names = list.map((s: { name: string }) => s.name);
    expect(names).toEqual(expect.arrayContaining(['ssrf-outbound-requests', 'query-efficiency', 'fastify-route-contracts', 'null-not-zero']));
    const ssrf = list.find((s: { name: string }) => s.name === 'ssrf-outbound-requests');
    expect(ssrf.linked_agents).toBe(0);
  });
});
