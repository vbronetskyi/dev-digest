import type {
  Skill,
  SkillImportPreview,
  SkillImportRequest,
  SkillInput,
  SkillListItem,
  SkillStats,
  SkillUpdate,
  SkillVersion,
} from '@devdigest/shared';
import { SkillInput as SkillInputSchema } from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import { AppError, NotFoundError, ValidationError } from '../../platform/errors.js';
import { SkillsRepository } from './repository.js';
import { buildImportPreview, toRawSkillUrl, toSkillDto } from './helpers.js';

/**
 * Skills library. Bodies are versioned (every body change snapshots a new
 * version); imports go through a preview because the fetched text is third-party
 * and ends up in reviewer prompts.
 */
export class SkillsService {
  private repo: SkillsRepository;

  constructor(private container: Container) {
    this.repo = new SkillsRepository(container.db);
  }

  async list(workspaceId: string): Promise<SkillListItem[]> {
    const rows = await this.repo.list(workspaceId);
    return rows.map(({ skill, linkedAgents }) => ({ ...toSkillDto(skill), linked_agents: linkedAgents }));
  }

  async get(workspaceId: string, id: string): Promise<Skill> {
    return toSkillDto(await this.require(workspaceId, id));
  }

  async create(workspaceId: string, input: SkillInput): Promise<Skill> {
    await this.assertNameFree(workspaceId, input.name);
    const row = await this.repo.create({ workspaceId, ...input, source: 'manual' });
    return toSkillDto(row);
  }

  async update(workspaceId: string, id: string, patch: SkillUpdate): Promise<Skill> {
    const current = await this.require(workspaceId, id);
    if (patch.name && patch.name !== current.name) await this.assertNameFree(workspaceId, patch.name);
    return toSkillDto(await this.repo.update(id, patch));
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    if (!(await this.repo.delete(workspaceId, id))) throw new NotFoundError('Skill not found');
  }

  async versions(workspaceId: string, id: string): Promise<SkillVersion[]> {
    await this.require(workspaceId, id);
    const rows = await this.repo.versions(id);
    return rows.map((v) => ({ version: v.version, body: v.body, created_at: v.createdAt.toISOString() }));
  }

  async stats(workspaceId: string, id: string): Promise<SkillStats> {
    await this.require(workspaceId, id);
    const [linkedAgents, usage] = await Promise.all([
      this.repo.linkedAgents(id),
      this.repo.usage(workspaceId, id),
    ]);
    return {
      linked_agents: linkedAgents,
      runs_used: usage.runs,
      last_used_at: usage.lastUsedAt?.toISOString() ?? null,
    };
  }

  /** Fetch and parse a SKILL.md without saving anything. */
  async previewImport(url: string): Promise<SkillImportPreview> {
    const rawUrl = toRawSkillUrl(url);
    let doc;
    try {
      doc = await this.container.remoteDocuments.fetchText(rawUrl);
    } catch (err) {
      throw new ValidationError(`Could not fetch the skill: ${(err as Error).message}`);
    }
    return buildImportPreview(doc.url, doc.text, 'custom');
  }

  /** Fetch again and save, applying the overrides picked on the preview screen. */
  async import(workspaceId: string, req: SkillImportRequest): Promise<Skill> {
    const preview = await this.previewImport(req.url);
    const parsed = SkillInputSchema.safeParse({
      name: req.name ?? preview.name,
      description: preview.description,
      type: req.type ?? preview.type,
      body: preview.body,
    });
    if (!parsed.success) {
      throw new ValidationError('The fetched skill is not valid', parsed.error.flatten());
    }
    await this.assertNameFree(workspaceId, parsed.data.name);
    const row = await this.repo.create({
      workspaceId,
      ...parsed.data,
      source: 'imported_url',
      sourceUrl: preview.source_url,
    });
    return toSkillDto(row);
  }

  private async require(workspaceId: string, id: string) {
    const row = await this.repo.get(workspaceId, id);
    if (!row) throw new NotFoundError('Skill not found');
    return row;
  }

  private async assertNameFree(workspaceId: string, name: string): Promise<void> {
    if (await this.repo.findByName(workspaceId, name)) {
      throw new AppError('conflict', `A skill named "${name}" already exists`, 409);
    }
  }
}
