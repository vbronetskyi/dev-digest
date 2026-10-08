import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { SkillImportRequest, SkillInput, SkillUpdate } from '@devdigest/shared';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import { SkillsService } from './service.js';

/** Imports fetch a third-party URL: keep them cheap to abuse-proof. */
const IMPORT_RATE_LIMIT = { rateLimit: { max: 10, timeWindow: '1 minute' } };

/**
 * L02 — skills library.
 *   GET    /skills                  → list with linked-agent counts
 *   POST   /skills                  → create a manual skill (version 1)
 *   GET    /skills/:id              → one skill
 *   PUT    /skills/:id              → update; a changed body becomes a new version
 *   DELETE /skills/:id              → delete (unlinks it from every agent)
 *   GET    /skills/:id/versions     → body snapshots, newest first
 *   GET    /skills/:id/stats        → linked agents + runs whose prompt used it
 *   POST   /skills/import/preview   → fetch + parse a SKILL.md URL, save nothing
 *   POST   /skills/import           → fetch + save as source=imported_url
 */
export default async function skillsRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const service = new SkillsService(app.container);

  app.get('/skills', async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return service.list(workspaceId);
  });

  app.post('/skills', { schema: { body: SkillInput } }, async (req, reply) => {
    const { workspaceId } = await getContext(app.container, req);
    reply.status(201);
    return service.create(workspaceId, req.body);
  });

  app.post(
    '/skills/import/preview',
    { schema: { body: z.object({ url: SkillImportRequest.shape.url }) }, config: IMPORT_RATE_LIMIT },
    async (req) => {
      await getContext(app.container, req);
      return service.previewImport(req.body.url);
    },
  );

  app.post(
    '/skills/import',
    { schema: { body: SkillImportRequest }, config: IMPORT_RATE_LIMIT },
    async (req, reply) => {
      const { workspaceId } = await getContext(app.container, req);
      reply.status(201);
      return service.import(workspaceId, req.body);
    },
  );

  app.get('/skills/:id', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return service.get(workspaceId, req.params.id);
  });

  app.put('/skills/:id', { schema: { params: IdParams, body: SkillUpdate } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return service.update(workspaceId, req.params.id, req.body);
  });

  app.delete('/skills/:id', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    await service.delete(workspaceId, req.params.id);
    return { ok: true };
  });

  app.get('/skills/:id/versions', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return service.versions(workspaceId, req.params.id);
  });

  app.get('/skills/:id/stats', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return service.stats(workspaceId, req.params.id);
  });
}
