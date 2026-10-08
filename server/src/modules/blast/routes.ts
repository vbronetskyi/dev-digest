import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import { BlastService } from './service.js';

/**
 * HW L04 — blast radius.
 *   GET /pulls/:id/blast-radius → changed symbols, their callers, affected endpoints/crons
 */
export default async function blastRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const service = new BlastService(app.container);

  app.get('/pulls/:id/blast-radius', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    const result = await service.forPull(workspaceId, req.params.id);
    req.log.info({ prId: req.params.id, durationMs: result.duration_ms, llmCalls: 0 }, 'blast radius served');
    return result;
  });
}
