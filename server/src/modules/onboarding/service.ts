import { Onboarding } from '@devdigest/shared';
import type { RepoRef, TrackedFile } from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import { ConflictError, ExternalServiceError, NotFoundError } from '../../platform/errors.js';
import { loadPromptTemplate } from '../../platform/prompts.js';
import { resolveFeatureLlm } from '../_shared/feature-models.js';
import { withDeadline } from '../_shared/deadline.js';
import { contextDocsFrom } from '../_shared/project-context.js';
import { OnboardingRepository } from './repository.js';
import {
  MAX_ENDPOINT_FILES,
  ONBOARDING_DEADLINE_MS,
  ONBOARDING_OPENROUTER_MODEL,
  ONBOARDING_SCHEMA_NAME,
  READING_PATH_EXCLUDE,
  READING_PATH_LEN,
} from './constants.js';
import {
  capFacts,
  infraFrom,
  languagesFrom,
  managerFor,
  manifestPaths,
  packageManagerFrom,
  parseManifest,
  topDirsFrom,
  type ManifestFacts,
  type RepoFacts,
} from './facts.js';
import { buildOnboardingMessages, groundTour, OnboardingOutput, skeletonTour } from './helpers.js';

const INDEXED = new Set(['full', 'partial']);
const NO_GRAPH_NOTE = 'The index has no import graph or endpoints for this repository (it parses JS/TS only).';

/**
 * SPEC-02 — the onboarding tour: facts collected by code ($0), one model call
 * for the narrative, grounded by the server; a skeleton from the facts when
 * the model is unavailable.
 */
export class OnboardingService {
  private repo: OnboardingRepository;
  /** Repos with a generation in flight (AC-17); one API process, so memory is enough. */
  private running = new Set<string>();

  constructor(private container: Container) {
    this.repo = new OnboardingRepository(container.db);
  }

  /** AC-18: the stored tour, no model call. */
  async get(workspaceId: string, repoId: string): Promise<Onboarding | null> {
    await this.refOrThrow(workspaceId, repoId);
    return this.stored(repoId);
  }

  async generate(workspaceId: string, repoId: string): Promise<Onboarding> {
    const ref = await this.refOrThrow(workspaceId, repoId);
    if (!this.container.config.repoIntelEnabled) throw new ConflictError('Repo intel is off, so there is no index to build a tour from.');
    const state = await this.container.repoIntel.getIndexState(repoId);
    if (!INDEXED.has(state.status) || !state.lastIndexedSha) {
      throw new ConflictError('This repository has no completed index yet. Index it first, then generate the tour.');
    }
    if (this.running.has(repoId)) throw new ConflictError('A tour for this repository is already being generated.');
    this.running.add(repoId);
    try {
      const tree = (await this.container.git.listFiles(ref)) ?? [];
      const facts = await this.collectFacts(ref, repoId, state.lastIndexedSha, tree);
      const tracked = new Set(tree.map((f) => f.path));
      const base = { generated_at: new Date().toISOString(), indexed_sha: facts.indexed_sha, files_total: facts.files_total };

      let tour: Onboarding;
      try {
        const { llm, model } = await resolveFeatureLlm(this.container, workspaceId, 'onboarding', ONBOARDING_OPENROUTER_MODEL);
        const system = await loadPromptTemplate('onboarding.system.md');
        const res = await withDeadline(
          llm.completeStructured({
            model,
            schema: OnboardingOutput,
            schemaName: ONBOARDING_SCHEMA_NAME,
            messages: buildOnboardingMessages(system, facts),
            sessionId: `repo:${repoId}:onboarding`,
          }),
          ONBOARDING_DEADLINE_MS,
          'Writing the onboarding tour',
        );
        tour = groundTour(res.data, facts, tracked, { ...base, source: 'model', reason: null, model, cost_usd: res.costUsd });
      } catch (err) {
        tour = skeletonTour(facts, tracked, { ...base, reason: (err as Error).message.slice(0, 300) });
      }

      // AC-15: a failed regeneration never replaces a tour the model wrote.
      if (tour.meta?.source === 'skeleton') {
        const stored = await this.stored(repoId);
        if (stored?.meta?.source === 'model') {
          throw new ExternalServiceError(`Couldn't regenerate the tour (${tour.meta.reason}). The previous tour is kept.`);
        }
      }
      await this.repo.upsert(repoId, tour);
      return tour;
    } finally {
      this.running.delete(repoId);
    }
  }

  /** AC-1–AC-6: everything the tour states, from the git tree, ≤ 10 manifests and the index. */
  private async collectFacts(ref: RepoRef, repoId: string, indexedSha: string, tree: TrackedFile[]): Promise<RepoFacts> {
    const manifests: ManifestFacts[] = [];
    for (const path of manifestPaths(tree)) {
      const text = await this.container.git.readCommitted(ref, path);
      const parsed = text === null ? null : parseManifest(path, text);
      if (parsed) manifests.push({ ...parsed, manager: managerFor(path, tree) });
    }
    const intel = this.container.repoIntel;
    const [fileFacts, topFiles, chains] = await Promise.all([
      intel.getRepoFileFacts(repoId),
      intel.getTopFilesByRank(repoId, READING_PATH_LEN, { exclude: READING_PATH_EXCLUDE }),
      intel.getCriticalPaths(repoId),
    ]);
    const endpoints = fileFacts.filter((f) => f.endpoints.length > 0).map((f) => ({ file: f.path, endpoints: f.endpoints }));
    const crons = fileFacts.filter((f) => f.crons.length > 0).map((f) => ({ file: f.path, crons: f.crons }));
    return capFacts({
      repo: `${ref.owner}/${ref.name}`,
      indexed_sha: indexedSha,
      files_total: tree.length,
      languages: languagesFrom(tree),
      top_dirs: topDirsFrom(tree),
      package_manager: packageManagerFrom(tree),
      manifests,
      infra: infraFrom(tree),
      endpoints: endpoints.slice(0, MAX_ENDPOINT_FILES),
      crons,
      top_files: topFiles,
      chains,
      context_docs: contextDocsFrom(tree).map((d) => d.path),
      index_note: topFiles.length === 0 && endpoints.length === 0 ? NO_GRAPH_NOTE : null,
    });
  }

  private async stored(repoId: string): Promise<Onboarding | null> {
    const json = await this.repo.get(repoId);
    if (json === undefined) return null;
    const parsed = Onboarding.safeParse(json);
    return parsed.success ? parsed.data : null;
  }

  private async refOrThrow(workspaceId: string, repoId: string): Promise<RepoRef> {
    const row = await this.repo.repoRef(workspaceId, repoId);
    if (!row) throw new NotFoundError('Repository not found');
    return { owner: row.owner, name: row.name };
  }
}
