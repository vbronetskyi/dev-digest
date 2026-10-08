import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';

export class OnboardingRepository {
  constructor(private db: Db) {}

  /** The repo (workspace-scoped) as git addresses it. */
  async repoRef(workspaceId: string, repoId: string) {
    const [row] = await this.db
      .select({ owner: t.repos.owner, name: t.repos.name, fullName: t.repos.fullName })
      .from(t.repos)
      .where(and(eq(t.repos.workspaceId, workspaceId), eq(t.repos.id, repoId)));
    return row;
  }

  async get(repoId: string): Promise<unknown | undefined> {
    const [row] = await this.db.select({ json: t.onboarding.json }).from(t.onboarding).where(eq(t.onboarding.repoId, repoId));
    return row?.json;
  }

  /** One tour per repository: a new one replaces the old. */
  async upsert(repoId: string, json: unknown): Promise<void> {
    const generatedAt = new Date();
    await this.db
      .insert(t.onboarding)
      .values({ repoId, json, generatedAt })
      .onConflictDoUpdate({ target: t.onboarding.repoId, set: { json, generatedAt } });
  }

}
