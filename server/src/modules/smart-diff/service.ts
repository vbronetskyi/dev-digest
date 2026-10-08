import type { SmartDiff } from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import { NotFoundError } from '../../platform/errors.js';
import { SmartDiffRepository } from './repository.js';
import { buildSmartDiff } from './helpers.js';

/**
 * The PR's files in the order a reviewer should read them — core logic,
 * then wiring, then boilerplate — with the latest findings pinned to their
 * lines and a split proposal for oversized PRs. Rules only, no model call.
 */
export class SmartDiffService {
  private repo: SmartDiffRepository;

  constructor(container: Container) {
    this.repo = new SmartDiffRepository(container.db);
  }

  async forPull(workspaceId: string, prId: string): Promise<SmartDiff> {
    const pull = await this.repo.pullWithFiles(workspaceId, prId);
    if (!pull) throw new NotFoundError('Pull request not found');
    const { reviewsUsed, findings } = await this.repo.latestFindings(prId);
    // Reviews carry no commit of their own; the PR remembers the head its last
    // review ran on, which is enough to say the markers may have drifted.
    return buildSmartDiff(pull.files, findings, { used: reviewsUsed, stale: pull.lastReviewedSha !== pull.headSha });
  }
}
