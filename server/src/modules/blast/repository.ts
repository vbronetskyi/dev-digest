import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';

export class BlastRepository {
  constructor(private db: Db) {}

  /** The PR (workspace-scoped) with its persisted file patches. */
  async pullWithFiles(workspaceId: string, prId: string) {
    const [pr] = await this.db
      .select({ id: t.pullRequests.id, repoId: t.pullRequests.repoId })
      .from(t.pullRequests)
      .where(and(eq(t.pullRequests.workspaceId, workspaceId), eq(t.pullRequests.id, prId)));
    if (!pr) return undefined;
    const files = await this.db
      .select({ path: t.prFiles.path, patch: t.prFiles.patch })
      .from(t.prFiles)
      .where(eq(t.prFiles.prId, prId));
    return { ...pr, files };
  }
}
