import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import { ContextService } from './service.js';

const FileQuery = z.object({ path: z.string().min(1).max(300) });

/**
 * L05 — Project Context Folder (SPEC-01).
 *   GET /repos/:id/context              → the repo's specs/ docs/ insights/ Markdown
 *   GET /repos/:id/context/file?path=   → one listed document's committed content
 */
export default async function contextRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const service = new ContextService(app.container);

  app.get('/repos/:id/context', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return service.list(workspaceId, req.params.id);
  });

  app.get('/repos/:id/context/file', { schema: { params: IdParams, querystring: FileQuery } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return service.file(workspaceId, req.params.id, req.query.path);
  });
}
