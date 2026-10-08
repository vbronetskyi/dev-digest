import { Severity } from '@devdigest/shared';
import type {
  ProposedSplit,
  SmartDiff,
  SmartDiffFile,
  SmartDiffFinding,
  SmartDiffReason,
  SmartDiffRole,
} from '@devdigest/shared';
import {
  FEATURE_MARKERS,
  GENERATED_MARKER,
  GENERATED_SCAN_LINES,
  GENERIC_DIRS,
  LOCKFILES,
  MAX_SPLITS,
  PATH_RULES,
  ROLE_OF,
  ROLE_ORDER,
  SPLIT_MIN_SHARE,
  SPLIT_REVIEWABLE_LINES,
  WIRING_LINE,
  WIRING_SHARE,
} from './constants.js';

export interface DiffFileInput {
  path: string;
  additions: number;
  deletions: number;
  patch: string | null;
}

export interface FindingInput {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  severity: string;
  title: string;
}

/** A file as this module serves it: the optional contract fields are always set. */
type ServedFile = SmartDiffFile & { reason: SmartDiffReason; findings: SmartDiffFinding[] };

const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;
/** Lines that carry no code of their own: blank, brackets, a lone comma. */
const NEUTRAL_LINE = /^[\s{}()[\];,]*$/;
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*|#(?!!))/;

/** The patch body from the first hunk on — `git diff` headers are not content. */
function hunkLines(patch: string | null): string[] {
  if (!patch) return [];
  const lines = patch.split('\n');
  const first = lines.findIndex((l) => l.startsWith('@@'));
  return first === -1 ? [] : lines.slice(first);
}

/** Added and removed lines of a unified diff, without their sign. */
export function changedLines(patch: string | null): string[] {
  return hunkLines(patch)
    .filter((l) => (l.startsWith('+') || l.startsWith('-')) && !l.startsWith('@@'))
    .map((l) => l.slice(1));
}

/** A new file whose opening lines declare it machine-written. */
export function looksGenerated(patch: string | null): boolean {
  const lines = hunkLines(patch);
  if (lines[0]?.match(HUNK_HEADER)?.[1] !== '1') return false;
  return lines
    .slice(1, 1 + GENERATED_SCAN_LINES)
    .some((l) => !l.startsWith('-') && GENERATED_MARKER.test(l));
}

/** Share of the meaningful changed lines that only connect code; null when there are none. */
export function wiringShare(lines: string[]): number | null {
  const meaningful = lines.filter((l) => !NEUTRAL_LINE.test(l) && !COMMENT_LINE.test(l));
  if (meaningful.length === 0) return null;
  return meaningful.filter((l) => WIRING_LINE.test(l)).length / meaningful.length;
}

/**
 * Why a file is core, wiring or boilerplate. Deterministic and explainable:
 * lockfile → path rules for mechanical files → no line changes (rename/mode) →
 * generated banner → remaining path rules → what the changed lines look like.
 */
export function classifyFile(file: DiffFileInput): SmartDiffReason {
  const name = file.path.slice(file.path.lastIndexOf('/') + 1);
  if (LOCKFILES.has(name)) return 'lockfile';
  const byPath = PATH_RULES.find(([, re]) => re.test(file.path))?.[0];
  if (byPath && ROLE_OF[byPath] === 'boilerplate') return byPath;
  if (file.additions + file.deletions === 0) return 'rename';
  if (looksGenerated(file.patch)) return 'generated';
  if (byPath) return byPath;
  const share = wiringShare(changedLines(file.patch));
  return share !== null && share >= WIRING_SHARE ? 'imports_only' : 'source';
}

const SEVERITY_RANK: Record<Severity, number> = { CRITICAL: 0, WARNING: 1, SUGGESTION: 2 };
const NO_FINDING_RANK = 3;

/** The file's findings with a known severity, top to bottom. */
export function findingsForFile(path: string, findings: readonly FindingInput[]): SmartDiffFinding[] {
  return findings
    .filter((f) => f.file === path)
    .flatMap((f) => {
      const severity = Severity.safeParse(f.severity);
      if (!severity.success) return [];
      return [{ id: f.id, start_line: f.startLine, end_line: Math.max(f.startLine, f.endLine), severity: severity.data, title: f.title }];
    })
    .sort((a, b) => a.start_line - b.start_line || SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

function worstRank(file: ServedFile): number {
  return Math.min(NO_FINDING_RANK, ...file.findings.map((f) => SEVERITY_RANK[f.severity]));
}

/** Inside a group: files with the worst findings first, then the biggest changes. */
export function byReviewPriority(a: ServedFile, b: ServedFile): number {
  return (
    worstRank(a) - worstRank(b) ||
    b.additions + b.deletions - (a.additions + a.deletions) ||
    a.path.localeCompare(b.path)
  );
}

/**
 * Where a file lives, coarse to fine: the top directory (a package in a
 * monorepo) and the feature folder — the one after `modules/`, `_components/`
 * and the like, else the first directory that is not `src`, `lib`, `test`…
 */
export function areaOf(path: string): { top: string; feature: string } {
  const dirs = path.split('/').slice(0, -1);
  const top = dirs[0] && !GENERIC_DIRS.has(dirs[0]) ? dirs[0] : '';
  for (let i = dirs.length - 2; i >= 0; i--) {
    if (FEATURE_MARKERS.has(dirs[i]!)) return { top, feature: dirs[i + 1]! };
  }
  return { top, feature: dirs.slice(top ? 1 : 0).find((d) => !GENERIC_DIRS.has(d)) ?? '' };
}

interface SizedFile {
  path: string;
  role: SmartDiffRole;
  lines: number;
}

const biggestFirst = (a: SizedFile, b: SizedFile) => b.lines - a.lines || a.path.localeCompare(b.path);

/**
 * Cut the reviewable files along the coarsest boundary the PR crosses: top
 * directories when it spans several, feature folders inside one otherwise.
 * Slices under SPLIT_MIN_SHARE fold into the largest, after its own files;
 * fewer than two slices left means there is no clean cut and nothing is
 * proposed. Files are listed biggest first, so the head of the list names
 * what the slice is about.
 */
function proposeSplits(files: readonly SizedFile[], reviewable: number): ProposedSplit[] {
  const tops = new Set(files.map((f) => areaOf(f.path).top));
  const keyOf = (path: string) => {
    const { top, feature } = areaOf(path);
    const key = tops.size > 1 ? top : [top, feature].filter(Boolean).join('/');
    return key || '(root)';
  };
  const clusters = new Map<string, { files: SizedFile[]; lines: number }>();
  for (const f of files) {
    const key = keyOf(f.path);
    const c = clusters.get(key) ?? { files: [], lines: 0 };
    c.files.push(f);
    c.lines += f.lines;
    clusters.set(key, c);
  }
  const ranked = [...clusters].sort(([ka, a], [kb, b]) => b.lines - a.lines || ka.localeCompare(kb));
  const kept = ranked.filter(([, c], i) => i < MAX_SPLITS && c.lines >= reviewable * SPLIT_MIN_SHARE);
  if (kept.length < 2) return [];
  const folded = ranked.filter(([key]) => !kept.some(([k]) => k === key)).flatMap(([, c]) => c.files);
  return kept.map(([name, c], i) => ({
    name,
    files: [...c.files.sort(biggestFirst), ...(i === 0 ? folded.sort(biggestFirst) : [])].map((f) => f.path),
  }));
}

export function suggestSplit(files: readonly SizedFile[]): SmartDiff['split_suggestion'] {
  const reviewableFiles = files.filter((f) => f.role !== 'boilerplate');
  const reviewable = reviewableFiles.reduce((n, f) => n + f.lines, 0);
  const tooBig = reviewable > SPLIT_REVIEWABLE_LINES;
  return {
    too_big: tooBig,
    total_lines: files.reduce((n, f) => n + f.lines, 0),
    reviewable_lines: reviewable,
    proposed_splits: tooBig ? proposeSplits(reviewableFiles, reviewable) : [],
  };
}

/** The PR's files in reviewer order, with finding markers and a size verdict. */
export function buildSmartDiff(
  files: readonly DiffFileInput[],
  findings: readonly FindingInput[],
  reviews: { used: number; stale: boolean },
): SmartDiff {
  const entries = files.map((f) => {
    const reason = classifyFile(f);
    const marks = findingsForFile(f.path, findings);
    const file: ServedFile = {
      path: f.path,
      pseudocode_summary: null,
      additions: f.additions,
      deletions: f.deletions,
      finding_lines: [...new Set(marks.map((m) => m.start_line))],
      reason,
      findings: marks,
    };
    return { role: ROLE_OF[reason], file };
  });
  const groups = ROLE_ORDER.map((role) => ({
    role,
    files: entries.filter((e) => e.role === role).map((e) => e.file).sort(byReviewPriority),
  })).filter((g) => g.files.length > 0);
  const split = suggestSplit(
    entries.map((e) => ({ path: e.file.path, role: e.role, lines: e.file.additions + e.file.deletions })),
  );
  return { groups, split_suggestion: split, reviews_used: reviews.used, markers_stale: reviews.used > 0 && reviews.stale };
}
