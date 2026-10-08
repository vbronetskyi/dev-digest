import type { TrackedFile } from '@devdigest/shared';
import {
  FACTS_MAX_CHARS,
  KNOWN_FRAMEWORKS,
  LANGUAGE_BY_EXT,
  LOCKFILE_MANAGERS,
  MANIFEST_MAX_BYTES,
  MAX_CHAINS,
  MAX_CONTEXT_DOCS,
  MAX_DIRS,
  MAX_LANGUAGES,
  MAX_MANIFESTS,
  MAX_SCRIPTS,
  SCRIPT_MAX_CHARS,
} from './constants.js';

/**
 * SPEC-02 facts — everything the tour states, collected by code for $0. The
 * model only turns these into prose; nothing here comes from a model.
 */

export interface ManifestFacts {
  path: string;
  name: string | null;
  /** From the lockfile next to it; null when there is none. */
  manager: string | null;
  scripts: Record<string, string>;
  frameworks: string[];
}

export interface RepoFacts {
  repo: string;
  indexed_sha: string;
  files_total: number;
  languages: { language: string; files: number }[];
  top_dirs: { dir: string; files: number }[];
  package_manager: string | null;
  manifests: ManifestFacts[];
  infra: { dockerfile: string | null; compose: string | null; env_example: string | null; ci: string[] };
  endpoints: { file: string; endpoints: string[] }[];
  crons: { file: string; crons: string[] }[];
  /** Reading-path candidates: index rank descending, ties by path. */
  top_files: string[];
  /** Import chains from the top-ranked files. */
  chains: string[][];
  context_docs: string[];
  /** Said when the index has no graph or endpoints for this repo. */
  index_note: string | null;
}

const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1);
const depth = (path: string) => path.split('/').length - 1;

/** AC-1: committed files per language, by extension; unknown extensions are not a language. */
export function languagesFrom(files: readonly TrackedFile[]): RepoFacts['languages'] {
  const counts = new Map<string, number>();
  for (const f of files) {
    const dot = f.path.lastIndexOf('.');
    const language = dot > f.path.lastIndexOf('/') ? LANGUAGE_BY_EXT[f.path.slice(dot).toLowerCase()] : undefined;
    if (language) counts.set(language, (counts.get(language) ?? 0) + 1);
  }
  return [...counts]
    .map(([language, n]) => ({ language, files: n }))
    .sort((a, b) => b.files - a.files || a.language.localeCompare(b.language))
    .slice(0, MAX_LANGUAGES);
}

/** AC-1: committed files per top-level directory; files at the root count as "(root)". */
export function topDirsFrom(files: readonly TrackedFile[]): RepoFacts['top_dirs'] {
  const counts = new Map<string, number>();
  for (const f of files) {
    const slash = f.path.indexOf('/');
    const dir = slash === -1 ? '(root)' : f.path.slice(0, slash + 1);
    counts.set(dir, (counts.get(dir) ?? 0) + 1);
  }
  return [...counts]
    .map(([dir, n]) => ({ dir, files: n }))
    .sort((a, b) => b.files - a.files || a.dir.localeCompare(b.dir))
    .slice(0, MAX_DIRS);
}

/** AC-5: which package.json files get read — shallowest first, at most ten, none over 64 KB. */
export function manifestPaths(files: readonly TrackedFile[]): string[] {
  return files
    .filter((f) => baseName(f.path) === 'package.json' && !f.path.split('/').includes('node_modules') && f.bytes <= MANIFEST_MAX_BYTES)
    .map((f) => f.path)
    .sort((a, b) => depth(a) - depth(b) || a.localeCompare(b))
    .slice(0, MAX_MANIFESTS);
}

/** AC-2/AC-5: name, scripts and recognised frameworks of one package.json; null when it is not valid JSON. */
export function parseManifest(path: string, text: string): ManifestFacts | null {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const pkg = json as Record<string, unknown>;
  const record = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  const scripts: Record<string, string> = {};
  for (const [name, cmd] of Object.entries(record(pkg.scripts)).slice(0, MAX_SCRIPTS)) {
    if (typeof cmd === 'string') scripts[name.slice(0, 40)] = cmd.slice(0, SCRIPT_MAX_CHARS);
  }
  const deps = new Set([...Object.keys(record(pkg.dependencies)), ...Object.keys(record(pkg.devDependencies))]);
  return {
    path,
    name: typeof pkg.name === 'string' ? pkg.name.slice(0, 80) : null,
    manager: null,
    scripts,
    frameworks: KNOWN_FRAMEWORKS.filter((f) => deps.has(f)),
  };
}

/** AC-2: package managers named by the lockfiles present ("pnpm, npm" in a mixed monorepo). */
export function packageManagerFrom(files: readonly TrackedFile[]): string | null {
  const found = new Set<string>();
  for (const f of files) {
    const manager = LOCKFILE_MANAGERS[baseName(f.path)];
    if (manager && !f.path.split('/').includes('node_modules')) found.add(manager);
  }
  return found.size > 0 ? [...found].sort().join(', ') : null;
}

/** The package manager of one manifest: the lockfile in the same directory. */
export function managerFor(manifestPath: string, files: readonly TrackedFile[]): string | null {
  const dir = manifestPath.slice(0, manifestPath.lastIndexOf('/') + 1);
  for (const [lockfile, manager] of Object.entries(LOCKFILE_MANAGERS)) {
    if (files.some((f) => f.path === dir + lockfile)) return manager;
  }
  return null;
}

/** AC-3: infrastructure files by path only — their content is never read. */
export function infraFrom(files: readonly TrackedFile[]): RepoFacts['infra'] {
  const paths = files.map((f) => f.path).sort((a, b) => depth(a) - depth(b) || a.localeCompare(b));
  return {
    dockerfile: paths.find((p) => /^Dockerfile(\..+)?$/.test(baseName(p))) ?? null,
    compose: paths.find((p) => /^(docker-)?compose(\.[\w-]+)?\.ya?ml$/.test(baseName(p))) ?? null,
    env_example: paths.find((p) => /^\.env\.(example|sample|template)$/.test(baseName(p))) ?? null,
    ci: paths.filter((p) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(p)).slice(0, 5),
  };
}

/**
 * AC-6: keep the facts sent to the model under FACTS_MAX_CHARS of JSON by
 * trimming the longest lists first. Order inside each list is kept.
 */
export function capFacts(facts: RepoFacts, maxChars = FACTS_MAX_CHARS): RepoFacts {
  const out: RepoFacts = structuredClone(facts);
  out.chains = out.chains.slice(0, MAX_CHAINS);
  out.context_docs = out.context_docs.slice(0, MAX_CONTEXT_DOCS);
  const size = () => JSON.stringify(out).length;
  const trimmers: Array<() => boolean> = [
    () => shrink(out.endpoints),
    () => shrink(out.crons),
    () => shrink(out.context_docs),
    () => shrink(out.chains),
    () => shrink(out.top_dirs),
    () => shrink(out.manifests),
    () => shrink(out.languages),
  ];
  while (size() > maxChars) {
    if (!trimmers.some((trim) => trim())) break;
  }
  return out;
}

/** Drop the last quarter of a list (at least one item); false when it is empty. */
function shrink(list: unknown[]): boolean {
  if (list.length === 0) return false;
  list.length = Math.max(0, list.length - Math.max(1, Math.ceil(list.length / 4)));
  return true;
}
