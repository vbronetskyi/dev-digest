import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';
import type { FindingInput } from './helpers.js';

export class SmartDiffRepository {
  constructor(private db: Db) {}

  /** The PR (workspace-scoped) with its persisted files, in path order. */
  async pullWithFiles(workspaceId: string, prId: string) {
    const [pr] = await this.db
      .select({ id: t.pullRequests.id, headSha: t.pullRequests.headSha, lastReviewedSha: t.pullRequests.lastReviewedSha })
      .from(t.pullRequests)
      .where(and(eq(t.pullRequests.workspaceId, workspaceId), eq(t.pullRequests.id, prId)));
    if (!pr) return undefined;
    const files = await this.db
      .select({
        path: t.prFiles.path,
        additions: t.prFiles.additions,
        deletions: t.prFiles.deletions,
        patch: t.prFiles.patch,
      })
      .from(t.prFiles)
      .where(eq(t.prFiles.prId, prId))
      .orderBy(asc(t.prFiles.path));
    return { ...pr, files };
  }

  /**
   * Open findings of the newest review by each agent on the PR. Older reviews
   * by the same agent are superseded, and rejected findings are not markers.
   */
  async latestFindings(prId: string): Promise<{ reviewsUsed: number; findings: FindingInput[] }> {
    const reviews = await this.db
      .select({ id: t.reviews.id, agentId: t.reviews.agentId })
      .from(t.reviews)
      .where(and(eq(t.reviews.prId, prId), eq(t.reviews.kind, 'review')))
      .orderBy(desc(t.reviews.createdAt));
    const latest = new Map<string, string>();
    for (const r of reviews) {
      const agent = r.agentId ?? 'no-agent';
      if (!latest.has(agent)) latest.set(agent, r.id);
    }
    const ids = [...latest.values()];
    if (ids.length === 0) return { reviewsUsed: 0, findings: [] };
    const findings = await this.db
      .select({
        id: t.findings.id,
        file: t.findings.file,
        startLine: t.findings.startLine,
        endLine: t.findings.endLine,
        severity: t.findings.severity,
        title: t.findings.title,
      })
      .from(t.findings)
      .where(and(inArray(t.findings.reviewId, ids), isNull(t.findings.dismissedAt)));
    return { reviewsUsed: ids.length, findings };
  }
}
