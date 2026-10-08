import type { Container } from '../../platform/container.js';
import type { UnifiedDiff } from '@devdigest/shared';
import { parseUnifiedDiff } from '../../adapters/git/diff-parser.js';
import * as schema from '../../db/schema.js';
import type { ReviewRepository, PullRow } from './repository.js';

/** Raised when no source yields a single changed file with a patch. */
export class EmptyDiffError extends Error {
  constructor() {
    super('the PR has no changed files with a patch — nothing to review (empty, binary-only, or GitHub unreachable)');
    this.name = 'EmptyDiffError';
  }
}

/**
 * Load the unified diff for a PR, in order:
 *   1. `git diff base...head` on the local clone;
 *   2. the persisted pr_files patches (written when the PR page is opened);
 *   3. the files from GitHub, persisted for next time — a review started over
 *      the API or MCP never opened the PR page, so (2) can be empty.
 * Nothing anywhere → EmptyDiffError, so the run fails instead of "approving" an
 * empty diff with score 100.
 */
export async function loadDiff(
  container: Container,
  repo: ReviewRepository,
  workspaceId: string,
  pull: PullRow,
  repoRow: typeof schema.repos.$inferSelect,
): Promise<UnifiedDiff> {
  try {
    const diff = await container.git.diff(
      { owner: repoRow.owner, name: repoRow.name },
      pull.base,
      pull.headSha,
    );
    if (diff.files.length > 0) return diff;
  } catch {
    /* fall through to pr_files reconstruction */
  }
  const persisted = await diffFromPrFiles(repo, pull.id);
  if (persisted.files.length > 0) return persisted;

  try {
    const gh = await container.github();
    const detail = await gh.getPullRequest({ owner: repoRow.owner, name: repoRow.name }, pull.number);
    await repo.replacePrFiles(pull.id, detail.files);
    const fetched = await diffFromPrFiles(repo, pull.id);
    if (fetched.files.length > 0) return fetched;
  } catch {
    /* no token / offline — nothing more to try */
  }
  throw new EmptyDiffError();
}

/** Reconstruct a UnifiedDiff from persisted pr_files patches. */
export async function diffFromPrFiles(repo: ReviewRepository, prId: string): Promise<UnifiedDiff> {
  const files = await repo.getPrFiles(prId);
  const parts: string[] = [];
  for (const f of files) {
    if (!f.patch) continue;
    parts.push(`diff --git a/${f.path} b/${f.path}`);
    parts.push(`--- a/${f.path}`);
    parts.push(`+++ b/${f.path}`);
    parts.push(f.patch);
  }
  return parseUnifiedDiff(parts.join('\n'));
}
