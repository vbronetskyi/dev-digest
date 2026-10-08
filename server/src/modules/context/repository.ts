import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';

export class ContextRepository {
  constructor(private db: Db) {}

  /** The repo (workspace-scoped) as the git adapter addresses it. */
  async repoRef(workspaceId: string, repoId: string) {
    const [row] = await this.db
      .select({ owner: t.repos.owner, name: t.repos.name })
      .from(t.repos)
      .where(and(eq(t.repos.workspaceId, workspaceId), eq(t.repos.id, repoId)));
    return row;
  }

  /** Every agent's attached paths in the workspace — to count who uses a document. */
  async attachedPaths(workspaceId: string): Promise<string[][]> {
    const rows = await this.db
      .select({ paths: t.agents.contextPaths })
      .from(t.agents)
      .where(eq(t.agents.workspaceId, workspaceId));
    return rows.map((r) => r.paths);
  }
}
