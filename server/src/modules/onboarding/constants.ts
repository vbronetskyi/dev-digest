/** SPEC-02 limits and lookup tables for the onboarding tour. */

export const ONBOARDING_SCHEMA_NAME = 'OnboardingTour';
/** When the `onboarding` feature model's provider has no key. */
export const ONBOARDING_OPENROUTER_MODEL = 'deepseek/deepseek-v4-flash';
export const ONBOARDING_DEADLINE_MS = 90_000;

/** AC-6: JSON characters of facts sent to the model (≈ 6K tokens). */
export const FACTS_MAX_CHARS = 24_000;
/** AC-5: package.json files read, and the size each may have. */
export const MAX_MANIFESTS = 10;
export const MANIFEST_MAX_BYTES = 64 * 1024;
/** AC-9: steps in the reading path. */
export const READING_PATH_LEN = 8;
/**
 * AC-9: file names left out of the reading path. PageRank pools rank in files
 * that import nothing, so style, constant and type modules rank high without
 * being where a newcomer should start.
 */
export const READING_PATH_EXCLUDED_NAME = /^(styles?|constants?|types?)\.[cm]?[jt]sx?$|\.d\.[cm]?ts$/;
/** Ranked files fetched before the name filter, so eight remain after it. */
export const READING_PATH_FETCH = 40;

export const MAX_LANGUAGES = 8;
export const MAX_DIRS = 12;
export const MAX_SCRIPTS = 12;
export const SCRIPT_MAX_CHARS = 160;
export const MAX_CHAINS = 5;
export const MAX_CONTEXT_DOCS = 15;
export const MAX_ENDPOINT_FILES = 40;

/** AC-8: the five sections, in tour order, with their fixed titles. */
export const SECTIONS = [
  { kind: 'architecture', title: 'Architecture overview' },
  { kind: 'critical_paths', title: 'Critical paths' },
  { kind: 'how_to_run', title: 'How to run locally' },
  { kind: 'reading_path', title: 'Guided reading path' },
  { kind: 'first_tasks', title: 'First tasks' },
] as const;
export type SectionKind = (typeof SECTIONS)[number]['kind'];

export const LANGUAGE_BY_EXT: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.mts': 'TypeScript',
  '.cts': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.cs': 'C#',
  '.swift': 'Swift',
  '.c': 'C',
  '.h': 'C',
  '.cpp': 'C++',
  '.hpp': 'C++',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
  '.sql': 'SQL',
  '.css': 'CSS',
  '.scss': 'CSS',
  '.html': 'HTML',
  '.sh': 'Shell',
  '.md': 'Markdown',
};

export const LOCKFILE_MANAGERS: Record<string, string> = {
  'pnpm-lock.yaml': 'pnpm',
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'bun.lockb': 'bun',
  'bun.lock': 'bun',
};

/** AC-2: dependencies worth naming in a tour; anything else is noise for a newcomer. */
export const KNOWN_FRAMEWORKS = [
  'next',
  'react',
  'vue',
  'svelte',
  '@angular/core',
  'express',
  'fastify',
  '@nestjs/core',
  'koa',
  'hono',
  'drizzle-orm',
  'prisma',
  '@prisma/client',
  'typeorm',
  'mongoose',
  'pg',
  'ioredis',
  'bullmq',
  'zod',
  '@tanstack/react-query',
  'tailwindcss',
  'vitest',
  'jest',
  '@playwright/test',
  'openai',
  '@anthropic-ai/sdk',
  '@modelcontextprotocol/sdk',
  'simple-git',
  '@octokit/rest',
];
