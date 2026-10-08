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

const PATCH = '@@ -10,3 +10,4 @@\n   port: 3000,\n+  stripeKey: "sk_live_xxx",\n   redisUrl: x,';
const REVIEW: Review = {
  verdict: 'request_changes',
  summary: 'Hardcoded secret.',
  score: 40,
  findings: [
    {
      id: 'f1',
      severity: 'CRITICAL',
      category: 'security',
      title: 'Hardcoded Stripe key',
      file: 'src/config.ts',
      start_line: 11,
      end_line: 11,
      rationale: 'A live key is committed.',
      confidence: 0.9,
      kind: 'finding',
    },
  ],
};

let seq = 0;
d('L04 run lookup and diff fallback (Testcontainers pg)', () => {
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

  /** A repo + PR #7; `withFiles` decides whether the PR page was "opened" (pr_files persisted). */
  async function pr(withFiles: boolean) {
    const name = `api-${seq++}`;
    const [repo] = await pg.handle.db.insert(t.repos).values({ workspaceId, owner: 'acme', name, fullName: `acme/${name}` }).returning();
    const [row] = await pg.handle.db
      .insert(t.pullRequests)
      .values({ workspaceId, repoId: repo!.id, number: 7, title: 'Config', author: 'a', branch: 'b', base: 'main', headSha: 'a1b2c3d4', status: 'needs_review' })
      .returning();
    if (withFiles) {
      await pg.handle.db.insert(t.prFiles).values({ prId: row!.id, path: 'src/config.ts', additions: 1, deletions: 0, patch: PATCH });
    }
    return { repo: repo!, pr: row! };
  }

  // `git diff` yields nothing, as when the local clone lacks the PR head.
  const app = (githubFiles?: { path: string; additions: number; deletions: number; patch?: string }[]) =>
    buildApp({
      config: config(),
      db: pg.handle.db,
      overrides: {
        embedder: new MockEmbedder(),
        git: new MockGitClient({ diff: '' }),
        github: new MockGitHubClient(githubFiles ? { detail: { files: githubFiles } } : {}),
        llm: { openai: new MockLLMProvider('openai', { structured: REVIEW }) },
      },
    });

  async function review(a: Awaited<ReturnType<typeof app>>, prId: string) {
    const agent = (await a.inject({ method: 'POST', url: '/agents', payload: { name: `Sec ${seq}`, provider: 'openai', model: 'gpt-4.1', system_prompt: 'sec' } })).json();
    const res = await a.inject({ method: 'POST', url: `/pulls/${prId}/review`, payload: { agentId: agent.id } });
    await waitForPrRuns(pg.handle.db, prId, { expected: 1 });
    return res.json().runs[0].run_id as string;
  }

  it('GET /runs/:id/review returns the run, its PR and the grounded review', async () => {
    const a = await app();
    const { repo, pr: row } = await pr(true);
    const runId = await review(a, row.id);

    const res = await a.inject({ method: 'GET', url: `/runs/${runId}/review` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ pr_id: row.id, pr_number: 7, repo: repo.fullName, run: { run_id: runId, status: 'done' } });
    expect(body.review.findings.map((f: { title: string }) => f.title)).toEqual(['Hardcoded Stripe key']);

    const missing = await a.inject({ method: 'GET', url: '/runs/00000000-0000-0000-0000-000000000000/review' });
    expect(missing.statusCode).toBe(404);
    await a.close();
  });

  it('fetches the files from GitHub when the PR page was never opened', async () => {
    const a = await app([{ path: 'src/config.ts', additions: 1, deletions: 0, patch: PATCH }]);
    const { pr: row } = await pr(false);
    const runId = await review(a, row.id);

    const body = (await a.inject({ method: 'GET', url: `/runs/${runId}/review` })).json();
    expect(body.run.status).toBe('done');
    expect(body.review.findings).toHaveLength(1);
    // persisted, so the next run (and the Files tab) has them too
    const files = await pg.handle.db.select().from(t.prFiles).where(eq(t.prFiles.prId, row.id));
    expect(files.map((f) => f.path)).toEqual(['src/config.ts']);
    await a.close();
  });

  it('fails the run instead of approving when there is no diff anywhere', async () => {
    const a = await app([]);
    const { pr: row } = await pr(false);
    const runId = await review(a, row.id);

    const body = (await a.inject({ method: 'GET', url: `/runs/${runId}/review` })).json();
    expect(body.run.status).toBe('failed');
    expect(body.run.error).toMatch(/nothing to review/);
    expect(body.run.score).toBeNull();
    expect(body.review).toBeNull();
    await a.close();
  });
});
