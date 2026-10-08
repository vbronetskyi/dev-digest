import type { ContextDocBody, ContextDocList } from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import { NotFoundError } from '../../platform/errors.js';
import { contextDocsFrom } from '../_shared/project-context.js';
import { ContextRepository } from './repository.js';
import { DOC_CUT_MARKER, MAX_DOC_CHARS } from './constants.js';

/**
 * SPEC-01 — the reviewed repository's specs/, docs/ and insights/ Markdown,
 * read from the default branch's commit in the local clone. No model call.
 */
export class ContextService {
  private repo: ContextRepository;

  constructor(private container: Container) {
    this.repo = new ContextRepository(container.db);
  }

  async list(workspaceId: string, repoId: string): Promise<ContextDocList> {
    const ref = await this.repoRefOrThrow(workspaceId, repoId);
    const tree = await this.container.git.listFiles(ref);
    if (!tree) return { docs: [], reason: 'no_clone' };
    const usage = new Map<string, number>();
    for (const paths of await this.repo.attachedPaths(workspaceId)) {
      for (const path of new Set(paths)) usage.set(path, (usage.get(path) ?? 0) + 1);
    }
    return { docs: contextDocsFrom(tree).map((d) => ({ ...d, used_by: usage.get(d.path) ?? 0 })), reason: null };
  }

  /** Only a listed document can be read — the path never reaches git otherwise. */
  async file(workspaceId: string, repoId: string, path: string): Promise<ContextDocBody> {
    const ref = await this.repoRefOrThrow(workspaceId, repoId);
    const doc = contextDocsFrom((await this.container.git.listFiles(ref)) ?? []).find((d) => d.path === path);
    if (!doc) throw new NotFoundError('Not a project context document of this repository');
    const body = await this.container.git.readCommitted(ref, doc.path);
    if (body === null) throw new NotFoundError('Document not found');
    return {
      path: doc.path,
      folder: doc.folder,
      body: body.length > MAX_DOC_CHARS ? body.slice(0, MAX_DOC_CHARS) + DOC_CUT_MARKER : body,
    };
  }

  private async repoRefOrThrow(workspaceId: string, repoId: string) {
    const ref = await this.repo.repoRef(workspaceId, repoId);
    if (!ref) throw new NotFoundError('Repository not found');
    return ref;
  }
}
