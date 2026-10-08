import { z } from 'zod';

/**
 * Conformance, Onboarding, Eval, Memory, Conventions, Skills,
 * Agents and their DTOs.
 */

// ---- Conformance ----
export const ConformanceStatus = z.enum(['implemented', 'missing', 'out_of_scope']);
export type ConformanceStatus = z.infer<typeof ConformanceStatus>;

export const ConformanceItem = z.object({
  requirement: z.string(),
  status: ConformanceStatus,
  evidence_file: z.string().nullish(),
  notes: z.string().nullish(),
});
export type ConformanceItem = z.infer<typeof ConformanceItem>;

export const Conformance = z.object({
  spec_id: z.string(),
  spec_title: z.string(),
  items: z.array(ConformanceItem),
  completeness_pct: z.number().min(0).max(100),
});
export type Conformance = z.infer<typeof Conformance>;

// ---- Onboarding ----
export const OnboardingLink = z.object({
  label: z.string(),
  path: z.string(),
});
export type OnboardingLink = z.infer<typeof OnboardingLink>;

export const OnboardingSection = z.object({
  kind: z.string(),
  title: z.string(),
  body: z.string(), // markdown
  diagram: z.string().nullish(), // mermaid
  links: z.array(OnboardingLink),
});
export type OnboardingSection = z.infer<typeof OnboardingSection>;

export const Onboarding = z.object({
  sections: z.array(OnboardingSection),
});
export type Onboarding = z.infer<typeof Onboarding>;

// ---- Eval ----
export const EvalPerTrace = z.object({
  name: z.string(),
  pass: z.boolean(),
  expected: z.unknown(),
  actual: z.unknown(),
});
export type EvalPerTrace = z.infer<typeof EvalPerTrace>;

export const EvalRun = z.object({
  recall: z.number().min(0).max(1),
  precision: z.number().min(0).max(1),
  citation_accuracy: z.number().min(0).max(1),
  traces_passed: z.number().int(),
  traces_total: z.number().int(),
  duration_ms: z.number().int(),
  cost_usd: z.number().nullable(),
  per_trace: z.array(EvalPerTrace),
});
export type EvalRun = z.infer<typeof EvalRun>;

export const EvalOwnerKind = z.enum(['skill', 'agent']);
export type EvalOwnerKind = z.infer<typeof EvalOwnerKind>;

export const EvalCase = z.object({
  id: z.string(),
  owner_kind: EvalOwnerKind,
  owner_id: z.string(),
  name: z.string(),
  input_diff: z.string(),
  input_files: z.unknown(),
  input_meta: z.unknown(),
  expected_output: z.unknown(),
  notes: z.string().nullish(),
});
export type EvalCase = z.infer<typeof EvalCase>;

// ---- Memory ----
export const MemoryScope = z.enum(['repo', 'global', 'team']);
export type MemoryScope = z.infer<typeof MemoryScope>;

export const MemoryKind = z.enum([
  'decision',
  'convention',
  'preference',
  'fact',
  'learning',
]);
export type MemoryKind = z.infer<typeof MemoryKind>;

export const MemorySource = z.object({
  pr: z.number().int().nullish(),
  context: z.string(),
});
export type MemorySource = z.infer<typeof MemorySource>;

export const MemoryItem = z.object({
  content: z.string(),
  scope: MemoryScope,
  kind: MemoryKind,
  confidence: z.number().min(0).max(1),
  sources: z.array(MemorySource),
});
export type MemoryItem = z.infer<typeof MemoryItem>;

// ---- Skills ----
export const SkillType = z.enum(['rubric', 'convention', 'security', 'custom']);
export type SkillType = z.infer<typeof SkillType>;

export const SkillSource = z.enum(['manual', 'imported_url', 'imported_file', 'extracted', 'community']);
export type SkillSource = z.infer<typeof SkillSource>;

export const Skill = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: SkillType,
  source: SkillSource,
  body: z.string(),
  enabled: z.boolean(),
  version: z.number().int(),
  evidence_files: z.array(z.string()).nullish(),
  /** Raw SKILL.md URL an imported skill came from; null for manual skills. */
  source_url: z.string().nullish(),
  created_at: z.string().nullish(),
});
export type Skill = z.infer<typeof Skill>;

/** SKILL.md naming rule: lowercase words joined by hyphens, max 64 chars. */
export const SkillName = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase letters, digits and single hyphens')
  .max(64);

/** Bodies are capped so one skill cannot swamp the reviewer's context. */
export const SKILL_BODY_MAX_CHARS = 20000;

export const SkillInput = z.object({
  name: SkillName,
  description: z.string().trim().min(1).max(1024),
  type: SkillType,
  body: z.string().trim().min(1).max(SKILL_BODY_MAX_CHARS),
  enabled: z.boolean().optional(),
});
export type SkillInput = z.infer<typeof SkillInput>;

export const SkillUpdate = SkillInput.partial();
export type SkillUpdate = z.infer<typeof SkillUpdate>;

export const SkillListItem = Skill.extend({
  /** How many agents have this skill linked. */
  linked_agents: z.number().int(),
});
export type SkillListItem = z.infer<typeof SkillListItem>;

export const SkillVersion = z.object({
  version: z.number().int(),
  body: z.string(),
  created_at: z.string(),
});
export type SkillVersion = z.infer<typeof SkillVersion>;

export const SkillStats = z.object({
  linked_agents: z.array(z.object({ id: z.string(), name: z.string() })),
  /** Review runs whose prompt included this skill (any version). */
  runs_used: z.number().int(),
  last_used_at: z.string().nullable(),
});
export type SkillStats = z.infer<typeof SkillStats>;

export const SkillImportRequest = z.object({
  url: z.string().url().max(2048),
  /** Optional overrides chosen on the preview screen. */
  name: SkillName.optional(),
  type: SkillType.optional(),
});
export type SkillImportRequest = z.infer<typeof SkillImportRequest>;

export const SkillImportPreview = z.object({
  name: z.string(),
  description: z.string(),
  body: z.string(),
  type: SkillType,
  /** The URL actually fetched (GitHub page links are rewritten to raw); null for a file. */
  source_url: z.string().nullable(),
  /** Things a human should look at before importing third-party text. */
  warnings: z.array(z.string()),
});
export type SkillImportPreview = z.infer<typeof SkillImportPreview>;

/** Same cap as a fetched SKILL.md (256 KB). */
export const SKILL_FILE_MAX_CHARS = 256 * 1024;

/** A SKILL.md the user uploads or pastes; parsed and previewed like a URL import. */
export const SkillFileImport = z.object({
  text: z.string().min(1).max(SKILL_FILE_MAX_CHARS),
  filename: z.string().max(255).optional(),
  /** Optional overrides chosen on the preview screen. */
  name: SkillName.optional(),
  type: SkillType.optional(),
});
export type SkillFileImport = z.infer<typeof SkillFileImport>;

export const CommunitySkill = z.object({
  name: z.string(),
  repo: z.string(),
  stars: z.number().int(),
  lang: z.string(),
  desc: z.string(),
});
export type CommunitySkill = z.infer<typeof CommunitySkill>;

// ---- Conventions ----
export const ConventionCandidate = z.object({
  id: z.string(),
  rule: z.string(),
  evidence_path: z.string(),
  evidence_snippet: z.string(),
  confidence: z.number().min(0).max(1),
  accepted: z.boolean(),
});
export type ConventionCandidate = z.infer<typeof ConventionCandidate>;

/** Result of one extraction pass over a repo. */
export const ConventionExtraction = z.object({
  /** Every candidate stored for the repo after the pass: new ones plus earlier accepted ones. */
  candidates: z.array(ConventionCandidate),
  /** Files the model actually read. */
  sampled_files: z.array(z.string()),
  /** Conventions dropped because their snippet was not found in the cited file. */
  dropped: z.number().int(),
  model: z.string(),
  /** USD billed for both model calls; null when the provider reported no cost. */
  cost_usd: z.number().nullable(),
});
export type ConventionExtraction = z.infer<typeof ConventionExtraction>;

/** "Edit first" overrides; both optional — without them the rule and a derived name are used. */
export const ConventionAcceptRequest = z.object({
  rule: z.string().trim().min(1).max(500).optional(),
  name: SkillName.optional(),
});
export type ConventionAcceptRequest = z.infer<typeof ConventionAcceptRequest>;

export const ConventionAcceptResult = z.object({
  convention: ConventionCandidate,
  skill_id: z.string(),
  skill_name: z.string(),
});
export type ConventionAcceptResult = z.infer<typeof ConventionAcceptResult>;

// ---- Agents ----
// 'openrouter' routes through the OpenAI-compatible API (OpenAIProvider with a
// custom baseURL) — used by the CI runner for cheap models (DeepSeek/GLM/MiniMax).
export const Provider = z.enum(['openai', 'anthropic', 'openrouter']);
export type Provider = z.infer<typeof Provider>;

// Review execution strategy (matches @devdigest/reviewer-core's ReviewStrategy):
//  - single-pass: send the WHOLE diff in ONE model call (default)
//  - map-reduce:  one model call PER changed file (for very large diffs)
//  - auto:        single-pass, switching to map-reduce when the diff is large
export const ReviewStrategy = z.enum(['single-pass', 'map-reduce', 'auto']);
export type ReviewStrategy = z.infer<typeof ReviewStrategy>;

// CI gate policy — when a review should BLOCK (REQUEST_CHANGES + fail the check)
// vs just comment. Deterministic from finding severities, NOT the model's verdict:
//  - never:    never block, always comment (advisory only)
//  - critical: block iff >=1 CRITICAL finding (default)
//  - warning:  block iff >=1 WARNING or CRITICAL finding
//  - any:      block iff >=1 finding of any severity
export const CiFailOn = z.enum(['never', 'critical', 'warning', 'any']);
export type CiFailOn = z.infer<typeof CiFailOn>;

export const Agent = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  provider: Provider,
  model: z.string(),
  system_prompt: z.string(),
  output_schema: z.unknown().nullish(),
  enabled: z.boolean(),
  version: z.number().int(),
  strategy: ReviewStrategy.default('single-pass'),
  ci_fail_on: CiFailOn.default('critical'),
  // Inject repo-intel context (repo skeleton + callers + rank note) into this
  // agent's review prompt. Default on; gated again by the global flag.
  repo_intel: z.boolean().default(true),
});
export type Agent = z.infer<typeof Agent>;

export const AgentSkillLink = z.object({
  agent_id: z.string(),
  skill_id: z.string(),
  order: z.number().int(),
});
export type AgentSkillLink = z.infer<typeof AgentSkillLink>;

// The immutable config snapshot captured in `agent_versions` whenever an agent's
// config changes (everything but `enabled`). Mirrors the shape written by the
// agents repository — provider/model/prompt/output_schema/strategy/gate/repo_intel
// plus the ordered skill ids linked at snapshot time. Used for reproducibility
// (eval replays a past version) and for surfacing an agent's edit history.
export const AgentVersionConfig = z.object({
  provider: Provider,
  model: z.string(),
  system_prompt: z.string(),
  output_schema: z.unknown().nullish(),
  strategy: ReviewStrategy,
  ci_fail_on: CiFailOn,
  repo_intel: z.boolean(),
  skills: z.array(z.string()),
});
export type AgentVersionConfig = z.infer<typeof AgentVersionConfig>;

export const AgentVersion = z.object({
  agent_id: z.string(),
  version: z.number().int(),
  config: AgentVersionConfig,
  created_at: z.string(),
});
export type AgentVersion = z.infer<typeof AgentVersion>;
