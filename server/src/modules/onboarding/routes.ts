import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import { OnboardingService } from './service.js';

/**
 * L05 — Onboarding Generator (SPEC-02).
 *   GET  /repos/:id/onboarding → { onboarding: Onboarding | null } — stored tour, no model call
 *   POST /repos/:id/onboarding → { onboarding } — facts + one model call (or a skeleton)
 */
export default async function onboardingRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const service = new OnboardingService(app.container);

  app.get('/repos/:id/onboarding', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return { onboarding: await service.get(workspaceId, req.params.id) };
  });

  app.post(
    '/repos/:id/onboarding',
    { schema: { params: IdParams }, config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req) => {
      const { workspaceId } = await getContext(app.container, req);
      return { onboarding: await service.generate(workspaceId, req.params.id) };
    },
  );
}
