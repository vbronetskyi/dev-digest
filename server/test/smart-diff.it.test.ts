import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';
import { MockEmbedder, MockGitClient, MockGitHubClient, MockLLMProvider } from '../src/adapters/mocks.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;
const config = () => loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);

const SOURCE_PATCH = '@@ -1,2 +1,30 @@\n x\n+const url = req.body.url;\n+await fetch(url);';

d('HW L03 smart diff (Testcontainers pg)', () => {
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

  async function pullWithFiles() {
    const db = pg.handle.db;
    const name = `smart-${randomUUID().slice(0, 8)}`;
    const [repo] = await db.insert(t.repos).values({ workspaceId, owner: 'acme', name, fullName: `acme/${name}` }).returning();
    const [pr] = await db
      .insert(t.pullRequests)
      .values({ workspaceId, repoId: repo!.id, number: 1, title: 't', author: 'a', branch: 'b', base: 'main', headSha: 'h', lastReviewedSha: 'h', status: 'needs_review' })
      .returning();
    await db.insert(t.prFiles).values([
      { prId: pr!.id, path: 'src/share.ts', additions: 28, deletions: 0, patch: SOURCE_PATCH },
      { prId: pr!.id, path: 'src/index.ts', additions: 1, deletions: 0, patch: "@@ -1,1 +1,2 @@\n a\n+import share from './share.js';" },
      { prId: pr!.id, path: 'package-lock.json', additions: 40, deletions: 12, patch: null },
    ]);
    return pr!.id;
  }

  async function review(prId: string, agentId: string, at: string, findings: Array<{ line: number; dismissed?: boolean }>, kind: 'review' | 'summary' = 'review') {
    const db = pg.handle.db;
    const [row] = await db.insert(t.reviews).values({ workspaceId, prId, agentId, kind, verdict: 'request_changes', createdAt: new Date(at) }).returning();
    if (findings.length === 0) return;
    await db.insert(t.findings).values(
      findings.map((f) => ({
        reviewId: row!.id,
        file: 'src/share.ts',
        startLine: f.line,
        endLine: f.line,
        severity: 'CRITICAL',
        category: 'security',
        title: `line ${f.line}`,
        rationale: 'r',
        confidence: 0.9,
        dismissedAt: f.dismissed ? new Date() : null,
      })),
    );
  }

  it('groups the files for review and marks open findings from each agent’s newest review', async () => {
    const prId = await pullWithFiles();
    const security = randomUUID();
    const general = randomUUID();
    await review(prId, security, '2026-10-01T10:00:00Z', [{ line: 5 }]); // superseded by the next one
    await review(prId, security, '2026-10-02T10:00:00Z', [{ line: 9 }, { line: 12, dismissed: true }]);
    await review(prId, general, '2026-10-01T12:00:00Z', [{ line: 20 }]);
    await review(prId, general, '2026-10-03T12:00:00Z', [{ line: 30 }], 'summary'); // a summary is not a review
    llm.calls.length = 0;

    const res = await app.inject({ method: 'GET', url: `/pulls/${prId}/smart-diff` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.groups.map((g: { role: string; files: Array<{ path: string; reason: string }> }) => [g.role, g.files.map((f) => `${f.path}:${f.reason}`)])).toEqual([
      ['core', ['src/share.ts:source']],
      ['wiring', ['src/index.ts:entrypoint']],
      ['boilerplate', ['package-lock.json:lockfile']],
    ]);
    expect(body.groups[0].files[0].finding_lines).toEqual([9, 20]);
    expect(body.reviews_used).toBe(2);
    expect(body.markers_stale).toBe(false);
    expect(body.split_suggestion).toEqual({ too_big: false, total_lines: 81, reviewable_lines: 29, proposed_splits: [] });
    expect(llm.calls).toHaveLength(0);

    // A push after the review: same markers, now flagged as possibly shifted.
    await pg.handle.db.update(t.pullRequests).set({ headSha: 'h2' }).where(eq(t.pullRequests.id, prId));
    expect((await app.inject({ method: 'GET', url: `/pulls/${prId}/smart-diff` })).json().markers_stale).toBe(true);
  });

  it('works before any review, and 404s for a PR that is not there', async () => {
    const prId = await pullWithFiles();
    const body = (await app.inject({ method: 'GET', url: `/pulls/${prId}/smart-diff` })).json();
    expect(body.reviews_used).toBe(0);
    expect(body.groups.flatMap((g: { files: Array<{ finding_lines: number[] }> }) => g.files.flatMap((f) => f.finding_lines))).toEqual([]);
    expect((await app.inject({ method: 'GET', url: '/pulls/00000000-0000-0000-0000-000000000000/smart-diff' })).statusCode).toBe(404);
  });
});
