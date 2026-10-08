import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';
import type { SkillSource, SkillType } from '@devdigest/shared';
import type { SkillRow, SkillVersionRow } from '../../db/rows.js';
import { INITIAL_SKILL_VERSION } from './constants.js';

export interface NewSkill {
  workspaceId: string;
  name: string;
  description: string;
  type: SkillType;
  source: SkillSource;
  body: string;
  enabled?: boolean;
  sourceUrl?: string | null;
}

export interface SkillPatch {
  name?: string;
  description?: string;
  type?: SkillType;
  body?: string;
  enabled?: boolean;
}

export class SkillsRepository {
  constructor(private db: Db) {}

  /** All workspace skills with how many agents link each, alphabetical. */
  async list(workspaceId: string): Promise<{ skill: SkillRow; linkedAgents: number }[]> {
    const rows = await this.db
      .select({ skill: t.skills, linkedAgents: sql<number>`count(${t.agentSkills.agentId})::int` })
      .from(t.skills)
      .leftJoin(t.agentSkills, eq(t.agentSkills.skillId, t.skills.id))
      .where(eq(t.skills.workspaceId, workspaceId))
      .groupBy(t.skills.id)
      .orderBy(asc(t.skills.name));
    return rows;
  }

  async get(workspaceId: string, id: string): Promise<SkillRow | undefined> {
    const [row] = await this.db
      .select()
      .from(t.skills)
      .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.id, id)));
    return row;
  }

  async findByName(workspaceId: string, name: string): Promise<SkillRow | undefined> {
    const [row] = await this.db
      .select()
      .from(t.skills)
      .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.name, name)));
    return row;
  }

  /** Insert the skill and its version-1 snapshot together. */
  async create(values: NewSkill): Promise<SkillRow> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(t.skills)
        .values({ ...values, version: INITIAL_SKILL_VERSION })
        .returning();
      await tx
        .insert(t.skillVersions)
        .values({ skillId: row!.id, version: INITIAL_SKILL_VERSION, body: row!.body });
      return row!;
    });
  }

  /**
   * Apply a patch. A changed body bumps the version and snapshots it; metadata-only
   * edits keep the version. The row is locked so two concurrent edits cannot both
   * claim the same next version.
   */
  async update(id: string, patch: SkillPatch): Promise<SkillRow> {
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(t.skills).where(eq(t.skills.id, id)).for('update');
      const bodyChanged = patch.body !== undefined && patch.body !== current!.body;
      const version = bodyChanged ? current!.version + 1 : current!.version;
      const [row] = await tx
        .update(t.skills)
        .set({ ...patch, version })
        .where(eq(t.skills.id, id))
        .returning();
      if (bodyChanged) {
        await tx.insert(t.skillVersions).values({ skillId: id, version, body: patch.body! });
      }
      return row!;
    });
  }

  async delete(workspaceId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(t.skills)
      .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.id, id)))
      .returning({ id: t.skills.id });
    return rows.length > 0;
  }

  async versions(skillId: string): Promise<SkillVersionRow[]> {
    return this.db
      .select()
      .from(t.skillVersions)
      .where(eq(t.skillVersions.skillId, skillId))
      .orderBy(desc(t.skillVersions.version));
  }

  async linkedAgents(skillId: string): Promise<{ id: string; name: string }[]> {
    return this.db
      .select({ id: t.agents.id, name: t.agents.name })
      .from(t.agentSkills)
      .innerJoin(t.agents, eq(t.agents.id, t.agentSkills.agentId))
      .where(eq(t.agentSkills.skillId, skillId))
      .orderBy(asc(t.agents.name));
  }

  /**
   * Runs whose prompt included this skill. Read from the trace document, where the
   * executor records `config.skills` — the same source the trace drawer shows.
   */
  async usage(workspaceId: string, skillId: string): Promise<{ runs: number; lastUsedAt: Date | null }> {
    const [row] = await this.db
      .select({
        runs: sql<number>`count(*)::int`,
        lastUsedAt: sql<Date | null>`max(${t.agentRuns.ranAt})`,
      })
      .from(t.runTraces)
      .innerJoin(t.agentRuns, eq(t.agentRuns.id, t.runTraces.runId))
      .where(
        and(
          eq(t.agentRuns.workspaceId, workspaceId),
          sql`${t.runTraces.trace} -> 'config' -> 'skills' @> ${JSON.stringify([{ id: skillId }])}::jsonb`,
        ),
      );
    return { runs: row?.runs ?? 0, lastUsedAt: row?.lastUsedAt ? new Date(row.lastUsedAt) : null };
  }
}
