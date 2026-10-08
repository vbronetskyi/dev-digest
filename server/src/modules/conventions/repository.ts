import { and, desc, eq, like } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';
import type { ConventionRow } from '../../db/rows.js';
import type { GroundedConvention } from './helpers.js';

export type { ConventionRow };

/** Version written for a skill created from a convention (mirrors skills' initial version). */
const FIRST_SKILL_VERSION = 1;

export interface AcceptInput {
  workspaceId: string;
  conventionId: string;
  rule: string;
  /** Explicit name from "Edit first" — must be free. */
  name?: string;
  /** Used when no explicit name was given; suffixed until free. */
  baseName: string;
  description: string;
  body: (rule: string) => string;
  evidenceFile: string;
  uniqueName: (base: string, taken: ReadonlySet<string>) => string;
}

export type AcceptOutcome =
  | { kind: 'accepted'; convention: ConventionRow; skillId: string; skillName: string }
  | { kind: 'not_found' }
  | { kind: 'already_accepted' }
  | { kind: 'name_taken'; name: string };

export class ConventionsRepository {
  constructor(private db: Db) {}

  async getRepo(workspaceId: string, repoId: string) {
    const [row] = await this.db
      .select({ id: t.repos.id, owner: t.repos.owner, name: t.repos.name, fullName: t.repos.fullName })
      .from(t.repos)
      .where(and(eq(t.repos.workspaceId, workspaceId), eq(t.repos.id, repoId)));
    return row;
  }

  /** Candidates for a repo: accepted ones first, then by confidence. */
  async list(workspaceId: string, repoId: string): Promise<ConventionRow[]> {
    return this.db
      .select()
      .from(t.conventions)
      .where(and(eq(t.conventions.workspaceId, workspaceId), eq(t.conventions.repoId, repoId)))
      .orderBy(desc(t.conventions.accepted), desc(t.conventions.confidence));
  }

  /**
   * A new pass replaces the repo's pending candidates; accepted ones stay as the
   * record of what became a skill.
   */
  async replacePending(workspaceId: string, repoId: string, rows: GroundedConvention[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(t.conventions)
        .where(
          and(
            eq(t.conventions.workspaceId, workspaceId),
            eq(t.conventions.repoId, repoId),
            eq(t.conventions.accepted, false),
          ),
        );
      if (rows.length === 0) return;
      await tx.insert(t.conventions).values(
        rows.map((r) => ({
          workspaceId,
          repoId,
          rule: r.rule,
          evidencePath: r.evidencePath,
          evidenceSnippet: r.evidenceSnippet,
          confidence: r.confidence,
        })),
      );
    });
  }

  async get(workspaceId: string, id: string): Promise<ConventionRow | undefined> {
    const [row] = await this.db
      .select()
      .from(t.conventions)
      .where(and(eq(t.conventions.workspaceId, workspaceId), eq(t.conventions.id, id)));
    return row;
  }

  async delete(workspaceId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(t.conventions)
      .where(and(eq(t.conventions.workspaceId, workspaceId), eq(t.conventions.id, id)))
      .returning({ id: t.conventions.id });
    return rows.length > 0;
  }

  /**
   * Create the skill (with its first version) and mark the convention accepted in
   * one transaction. The convention row is locked, so a double click cannot
   * produce two skills.
   */
  async accept(input: AcceptInput): Promise<AcceptOutcome> {
    return this.db.transaction(async (tx) => {
      const [conv] = await tx
        .select()
        .from(t.conventions)
        .where(and(eq(t.conventions.workspaceId, input.workspaceId), eq(t.conventions.id, input.conventionId)))
        .for('update');
      if (!conv) return { kind: 'not_found' } as const;
      if (conv.accepted) return { kind: 'already_accepted' } as const;

      const prefix = input.name ?? input.baseName;
      const taken = new Set(
        (
          await tx
            .select({ name: t.skills.name })
            .from(t.skills)
            .where(and(eq(t.skills.workspaceId, input.workspaceId), like(t.skills.name, `${prefix}%`)))
        ).map((r) => r.name),
      );
      if (input.name && taken.has(input.name)) return { kind: 'name_taken', name: input.name } as const;
      const skillName = input.name ?? input.uniqueName(input.baseName, taken);

      const body = input.body(input.rule);
      const [skill] = await tx
        .insert(t.skills)
        .values({
          workspaceId: input.workspaceId,
          name: skillName,
          description: input.description,
          type: 'convention',
          source: 'extracted',
          body,
          enabled: true,
          version: FIRST_SKILL_VERSION,
          evidenceFiles: [input.evidenceFile],
        })
        .returning({ id: t.skills.id });
      await tx.insert(t.skillVersions).values({ skillId: skill!.id, version: FIRST_SKILL_VERSION, body });
      const [updated] = await tx
        .update(t.conventions)
        .set({ accepted: true, rule: input.rule })
        .where(eq(t.conventions.id, conv.id))
        .returning();
      return { kind: 'accepted', convention: updated!, skillId: skill!.id, skillName } as const;
    });
  }
}
