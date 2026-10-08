import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ConventionAcceptRequest } from '@devdigest/shared';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import { ConventionsService } from './service.js';

/** Each scan is two paid model calls. */
const EXTRACT_RATE_LIMIT = { rateLimit: { max: 5, timeWindow: '1 minute' } };

/**
 * L02 — conventions extractor.
 *   GET    /repos/:id/conventions          → stored candidates (accepted first)
 *   POST   /repos/:id/conventions/extract  → new pass: pick files, extract, ground, replace pending
 *   POST   /conventions/:id/accept         → create a `convention` skill from it {rule?, name?}
 *   DELETE /conventions/:id                → reject (delete the candidate)
 */
export default async function conventionsRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const service = new ConventionsService(app.container);

  app.get('/repos/:id/conventions', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return service.list(workspaceId, req.params.id);
  });

  app.post(
    '/repos/:id/conventions/extract',
    { schema: { params: IdParams }, config: EXTRACT_RATE_LIMIT },
    async (req) => {
      const { workspaceId } = await getContext(app.container, req);
      return service.extract(workspaceId, req.params.id);
    },
  );

  app.post(
    '/conventions/:id/accept',
    { schema: { params: IdParams, body: ConventionAcceptRequest } },
    async (req, reply) => {
      const { workspaceId } = await getContext(app.container, req);
      reply.status(201);
      return service.accept(workspaceId, req.params.id, req.body ?? {});
    },
  );

  app.delete('/conventions/:id', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    await service.reject(workspaceId, req.params.id);
    return { ok: true };
  });
}
