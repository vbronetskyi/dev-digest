import { z } from 'zod';
import type {
  ConventionAcceptRequest,
  ConventionAcceptResult,
  ConventionCandidate,
  ConventionExtraction,
  LLMProvider,
} from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import { AppError, ConfigError, ExternalServiceError, NotFoundError } from '../../platform/errors.js';
import { defaultFeatureModel, getFeatureModelOverride } from '../_shared/feature-models.js';
import { ConventionsRepository } from './repository.js';
import {
  CALL_DEADLINE_MS,
  CANDIDATE_FILES,
  EXTRACTION_SCHEMA_NAME,
  EXTRACTION_SYSTEM,
  MAX_FILE_CHARS,
  MAX_SELECTED_FILES,
  MAX_TOTAL_CHARS,
  OPENROUTER_FALLBACK_MODEL,
  SELECTION_SCHEMA_NAME,
  SELECTION_SYSTEM,
} from './constants.js';
import {
  buildExtractionMessages,
  buildSelectionMessages,
  buildSkillBody,
  groundConventions,
  pickOffered,
  ruleToSkillName,
  sumCosts,
  toConventionDto,
  uniqueName,
} from './helpers.js';

// Model output shapes. No min/max: strict JSON-schema mode rejects some keywords;
// limits are applied after parsing.
const FileSelection = z.object({ files: z.array(z.string()) });
const Extraction = z.object({
  conventions: z.array(
    z.object({
      rule: z.string(),
      evidence_path: z.string(),
      evidence_snippet: z.string(),
      confidence: z.number(),
    }),
  ),
});

/** Resolve or reject within `ms`. The underlying request is not aborted — see constants. */
async function withDeadline<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ExternalServiceError(`${what} took longer than ${ms / 1000}s`)), ms);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * L02 — conventions extractor. Two model calls over the cloned repo: pick files
 * from repo-intel's top-ranked ones, then extract rules that each quote one of
 * those files. A rule whose quote is not in the file is dropped. Accepting a
 * candidate turns it into a `convention` skill.
 */
export class ConventionsService {
  private repo: ConventionsRepository;

  constructor(private container: Container) {
    this.repo = new ConventionsRepository(container.db);
  }

  async list(workspaceId: string, repoId: string): Promise<ConventionCandidate[]> {
    await this.requireRepo(workspaceId, repoId);
    return (await this.repo.list(workspaceId, repoId)).map(toConventionDto);
  }

  async extract(workspaceId: string, repoId: string): Promise<ConventionExtraction> {
    const repo = await this.requireRepo(workspaceId, repoId);
    const candidates = await this.container.repoIntel.getConventionSamples(repoId, CANDIDATE_FILES);
    if (candidates.length === 0) {
      throw new AppError('repo_not_indexed', 'The repository is not indexed yet — wait for the Indexed badge, then scan.', 409);
    }
    const { llm, model } = await this.resolveModel(workspaceId);
    const sessionId = `${repo.fullName}:conventions`;

    const selection = await withDeadline(
      llm.completeStructured({
        model,
        schema: FileSelection,
        schemaName: SELECTION_SCHEMA_NAME,
        messages: buildSelectionMessages(repo.fullName, candidates, SELECTION_SYSTEM),
        sessionId,
      }),
      CALL_DEADLINE_MS,
      'Choosing files',
    );
    let chosen = pickOffered(selection.data.files, candidates, MAX_SELECTED_FILES);
    // A model that picks nothing usable still gets a fair sample: the most central files.
    if (chosen.length === 0) chosen = candidates.slice(0, MAX_SELECTED_FILES);

    const files = await this.readFiles({ owner: repo.owner, name: repo.name }, chosen);
    if (files.size === 0) {
      throw new AppError('clone_unreadable', 'None of the selected files could be read from the local clone.', 409);
    }

    const extraction = await withDeadline(
      llm.completeStructured({
        model,
        schema: Extraction,
        schemaName: EXTRACTION_SCHEMA_NAME,
        messages: buildExtractionMessages(repo.fullName, files, EXTRACTION_SYSTEM),
        sessionId,
      }),
      CALL_DEADLINE_MS,
      'Extracting conventions',
    );
    const { kept, dropped } = groundConventions(extraction.data.conventions, files);
    await this.repo.replacePending(workspaceId, repoId, kept);

    return {
      candidates: (await this.repo.list(workspaceId, repoId)).map(toConventionDto),
      sampled_files: [...files.keys()],
      dropped,
      model,
      cost_usd: sumCosts([selection.costUsd, extraction.costUsd]),
    };
  }

  async accept(workspaceId: string, id: string, req: ConventionAcceptRequest): Promise<ConventionAcceptResult> {
    const current = await this.repo.get(workspaceId, id);
    if (!current) throw new NotFoundError('Convention not found');
    const rule = req.rule ?? current.rule;
    const evidencePath = current.evidencePath ?? '';
    const evidenceFile = evidencePath.replace(/:\d+(?:-\d+)?$/, '');
    const outcome = await this.repo.accept({
      workspaceId,
      conventionId: id,
      rule,
      ...(req.name ? { name: req.name } : {}),
      baseName: ruleToSkillName(rule),
      description: rule.length > 200 ? `${rule.slice(0, 197)}…` : rule,
      body: (r) => buildSkillBody(r, evidencePath, current.evidenceSnippet ?? ''),
      evidenceFile,
      uniqueName,
    });
    switch (outcome.kind) {
      case 'not_found':
        throw new NotFoundError('Convention not found');
      case 'already_accepted':
        throw new AppError('already_accepted', 'This convention is already a skill.', 409);
      case 'name_taken':
        throw new AppError('conflict', `A skill named "${outcome.name}" already exists`, 409);
      case 'accepted':
        return { convention: toConventionDto(outcome.convention), skill_id: outcome.skillId, skill_name: outcome.skillName };
    }
  }

  async reject(workspaceId: string, id: string): Promise<void> {
    if (!(await this.repo.delete(workspaceId, id))) throw new NotFoundError('Convention not found');
  }

  /**
   * Settings override first. Otherwise the registry default, and when its provider
   * has no key, OpenRouter — the provider most workspaces here are set up with.
   */
  private async resolveModel(workspaceId: string): Promise<{ llm: LLMProvider; model: string }> {
    const override = await getFeatureModelOverride(this.container, workspaceId, 'conventions');
    if (override) return { llm: await this.container.llm(override.provider), model: override.model };
    const fallback = defaultFeatureModel('conventions');
    try {
      return { llm: await this.container.llm(fallback.provider), model: fallback.model };
    } catch (err) {
      if (!(err instanceof ConfigError)) throw err;
    }
    return { llm: await this.container.llm('openrouter'), model: OPENROUTER_FALLBACK_MODEL };
  }

  /** Read the chosen files from the clone within the character budgets; unreadable files are skipped. */
  private async readFiles(repo: { owner: string; name: string }, paths: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    let total = 0;
    for (const path of paths) {
      let text: string;
      try {
        text = await this.container.git.readFile(repo, path);
      } catch {
        continue;
      }
      if (!text.trim()) continue;
      const clipped = text.slice(0, Math.min(MAX_FILE_CHARS, MAX_TOTAL_CHARS - total));
      if (!clipped) break;
      out.set(path, clipped);
      total += clipped.length;
    }
    return out;
  }

  private async requireRepo(workspaceId: string, repoId: string) {
    const repo = await this.repo.getRepo(workspaceId, repoId);
    if (!repo) throw new NotFoundError('Repository not found');
    return repo;
  }
}
