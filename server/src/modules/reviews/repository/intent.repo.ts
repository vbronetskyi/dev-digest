import { eq } from 'drizzle-orm';
import type { Db } from '../../../db/client.js';
import * as t from '../../../db/schema.js';

export type IntentRow = typeof t.prIntent.$inferSelect;

export async function getIntent(db: Db, prId: string): Promise<IntentRow | undefined> {
  const [row] = await db.select().from(t.prIntent).where(eq(t.prIntent.prId, prId));
  return row;
}

/** One intent per PR: a new derivation replaces the old one. */
export async function upsertIntent(
  db: Db,
  values: { prId: string; intent: string; inScope: string[]; outOfScope: string[]; headSha: string; model: string; costUsd: number | null },
): Promise<IntentRow> {
  const [row] = await db
    .insert(t.prIntent)
    .values({ ...values, createdAt: new Date() })
    .onConflictDoUpdate({
      target: t.prIntent.prId,
      set: {
        intent: values.intent,
        inScope: values.inScope,
        outOfScope: values.outOfScope,
        headSha: values.headSha,
        model: values.model,
        costUsd: values.costUsd,
        createdAt: new Date(),
      },
    })
    .returning();
  return row!;
}
