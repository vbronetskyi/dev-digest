import type { ChatMessage, ConventionCandidate } from '@devdigest/shared';
import type { ConventionRow } from '../../db/rows.js';
import { CONFIDENCE_CAP_BY_FILES, MAX_CONVENTIONS, MIN_SNIPPET_CHARS } from './constants.js';

/** What the model returns per convention in step 2 (before grounding). */
export interface RawConvention {
  rule: string;
  evidence_path: string;
  evidence_snippet: string;
  /** Other sampled files said to show the same convention. */
  also_seen_in?: string[];
  confidence: number;
}

/** A convention whose snippet was found in the cited file. */
export interface GroundedConvention {
  rule: string;
  /** `path:start-end` (or `path:line` for one line), 1-based and inclusive. */
  evidencePath: string;
  /** The file's own lines for that range, dedented — never the model's copy. */
  evidenceSnippet: string;
  confidence: number;
}

const squash = (line: string) => line.replace(/\s+/g, ' ').trim();

/**
 * Find `snippet` in `content`, comparing line by line with whitespace collapsed
 * and blank lines skipped on both sides (models re-indent and drop blank lines).
 * Returns the 1-based inclusive line range, or null when it is not there.
 */
export function locateSnippet(content: string, snippet: string): { start: number; end: number } | null {
  const want = snippet.split(/\r?\n/).map(squash).filter(Boolean);
  if (want.length === 0 || want.join(' ').length < MIN_SNIPPET_CHARS) return null;
  const lines = content.split(/\r?\n/).map(squash);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== want[0]) continue;
    let k = 1;
    let j = i + 1;
    let last = i;
    while (k < want.length && j < lines.length) {
      if (lines[j] === '') {
        j++;
        continue;
      }
      if (lines[j] !== want[k]) break;
      last = j;
      k++;
      j++;
    }
    if (k === want.length) return { start: i + 1, end: last + 1 };
  }
  return null;
}

/** Strip the indentation common to every non-blank line. */
export function dedent(lines: string[]): string {
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)![0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(cut)).join('\n');
}

/**
 * Ceiling for a convention's confidence: how many sampled files show it. Paths
 * the model was not shown do not count.
 */
export function confidenceCap(citedPath: string, alsoSeenIn: readonly string[] | undefined, files: ReadonlyMap<string, string>): number {
  const support = new Set([citedPath, ...(alsoSeenIn ?? []).map((p) => p.trim()).filter((p) => files.has(p))]).size;
  return CONFIDENCE_CAP_BY_FILES[Math.min(support, CONFIDENCE_CAP_BY_FILES.length - 1)]!;
}

/**
 * Keep only conventions that cite a file the model was shown and quote it for
 * real; re-read the quoted range from the file itself. Duplicates by rule are
 * dropped, confidence is clamped to the ceiling from `confidenceCap`, the list
 * is capped and sorted.
 */
export function groundConventions(
  raw: RawConvention[],
  files: ReadonlyMap<string, string>,
): { kept: GroundedConvention[]; dropped: number } {
  const kept: GroundedConvention[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const c of raw) {
    const rule = c.rule.trim();
    const path = c.evidence_path.trim().replace(/:\d+(?:-\d+)?$/, '');
    const content = files.get(path);
    const at = content === undefined ? null : locateSnippet(content, c.evidence_snippet);
    if (!rule || !at || seen.has(rule.toLowerCase())) {
      dropped++;
      continue;
    }
    seen.add(rule.toLowerCase());
    const lines = content!.split(/\r?\n/).slice(at.start - 1, at.end);
    kept.push({
      rule,
      evidencePath: at.start === at.end ? `${path}:${at.start}` : `${path}:${at.start}-${at.end}`,
      evidenceSnippet: dedent(lines),
      confidence: Number.isFinite(c.confidence)
        ? Math.min(confidenceCap(path, c.also_seen_in, files), Math.max(0, c.confidence))
        : 0,
    });
  }
  kept.sort((a, b) => b.confidence - a.confidence);
  return { kept: kept.slice(0, MAX_CONVENTIONS), dropped: dropped + Math.max(0, kept.length - MAX_CONVENTIONS) };
}

const folderOf = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf('/')));

/**
 * Only paths from the offered list survive, in the given order, without repeats
 * and with at most `perFolder` from any one folder.
 */
export function pickOffered(selected: readonly string[], offered: readonly string[], max: number, perFolder: number): string[] {
  const allowed = new Set(offered);
  const perDir = new Map<string, number>();
  const out: string[] = [];
  for (const path of new Set(selected.map((p) => p.trim()))) {
    if (!allowed.has(path)) continue;
    const dir = folderOf(path);
    if ((perDir.get(dir) ?? 0) >= perFolder) continue;
    perDir.set(dir, (perDir.get(dir) ?? 0) + 1);
    out.push(path);
    if (out.length >= max) break;
  }
  return out;
}

export function buildSelectionMessages(repoName: string, candidates: readonly string[], system: string): ChatMessage[] {
  return [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Repository: ${repoName}\nCandidate files, most central first:\n${candidates.map((p) => `- ${p}`).join('\n')}`,
    },
  ];
}

export function buildExtractionMessages(
  repoName: string,
  files: ReadonlyMap<string, string>,
  system: string,
): ChatMessage[] {
  const blocks = [...files].map(([path, text]) => {
    const safe = text.replaceAll('</untrusted>', '<\\/untrusted>');
    return `<untrusted source="file:${path}">\n${safe}\n</untrusted>`;
  });
  return [
    { role: 'system', content: system },
    { role: 'user', content: `Repository: ${repoName}\n\n${blocks.join('\n\n')}` },
  ];
}

const STOP_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'by', 'via', 'is', 'are', 'be', 'always', 'never', 'every', 'all', 'each', 'use', 'from', 'that', 'its', 'their']);

/** A SKILL.md-style name from the rule: up to five meaningful words. */
export function ruleToSkillName(rule: string): string {
  const words = rule
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && !STOP_WORDS.has(w))
    .slice(0, 5);
  return words.join('-').slice(0, 56).replace(/-+$/, '') || 'convention';
}

/** `base`, or `base-2`, `base-3`… — the first one not in `taken`. */
export function uniqueName(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Skill body for an accepted convention — written for the reviewer that will read it. */
export function buildSkillBody(rule: string, evidencePath: string, snippet: string): string {
  const fence = snippet.includes('```') ? '~~~' : '```';
  return [
    `# ${rule}`,
    '',
    'A house convention of this repository, extracted from its code and accepted by a maintainer.',
    '',
    '## Flag',
    '- Changed code in the diff that breaks this convention. Quote the line and say what the',
    '  convention expects instead.',
    '',
    '## Do not flag',
    '- Code the diff does not touch.',
    '',
    '## Severity',
    'SUGGESTION. WARNING only when breaking the convention also causes a bug.',
    '',
    `## Example from \`${evidencePath}\``,
    fence,
    snippet,
    fence,
  ].join('\n');
}

export function toConventionDto(row: ConventionRow): ConventionCandidate {
  return {
    id: row.id,
    rule: row.rule,
    evidence_path: row.evidencePath ?? '',
    evidence_snippet: row.evidenceSnippet ?? '',
    confidence: row.confidence ?? 0,
    accepted: row.accepted,
  };
}

/** Total of known costs; null as soon as one call reported none (unknown is not zero). */
export function sumCosts(costs: (number | null)[]): number | null {
  return costs.some((c) => c === null) ? null : costs.reduce<number>((a, c) => a + (c as number), 0);
}
