import type { Skill, SkillImportPreview, SkillType } from '@devdigest/shared';
import type { SkillRow } from '../../db/rows.js';
import { LONG_BODY_WARNING_CHARS, STEERING_PATTERNS } from './constants.js';

export interface SkillDoc {
  attributes: Record<string, string>;
  body: string;
  hasFrontmatter: boolean;
}

/**
 * Split a SKILL.md into its YAML frontmatter and body. Only top-level scalar keys
 * are read (name, description, …): plain, single/double-quoted and `>`/`|` block
 * scalars. Nested maps are skipped — the importer needs nothing from them, and a
 * full YAML parser is not worth a new dependency.
 */
export function parseSkillDoc(raw: string): SkillDoc {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const match = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(text);
  if (!match) return { attributes: {}, body: text.trim(), hasFrontmatter: false };
  return {
    attributes: parseTopLevelScalars(match[1]!),
    body: text.slice(match[0].length).trim(),
    hasFrontmatter: true,
  };
}

function parseTopLevelScalars(yaml: string): Record<string, string> {
  const lines = yaml.split('\n');
  const out: Record<string, string> = {};
  for (let i = 0; i < lines.length; i++) {
    const m = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/.exec(lines[i]!);
    if (!m) continue;
    const key = m[1]!;
    const rest = m[2]!;
    // Collect the indented continuation lines that belong to this key.
    const block: string[] = [];
    while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]!) || lines[i + 1] === '')) {
      block.push(lines[++i]!);
    }
    while (block.length && block[block.length - 1] === '') block.pop();
    const indent = Math.min(...block.filter((l) => l.trim()).map((l) => l.match(/^\s*/)![0].length));
    const dedented = block.map((l) => l.slice(Number.isFinite(indent) ? indent : 0));

    if (/^[>|][+-]?$/.test(rest)) {
      out[key] = rest.startsWith('|') ? dedented.join('\n').trim() : foldLines(dedented);
    } else if (rest.startsWith('"')) {
      out[key] = unquoteDouble([rest, ...dedented].join(' '));
    } else if (rest.startsWith("'")) {
      out[key] = unquoteSingle([rest, ...dedented].join(' '));
    } else if (rest === '') {
      // A nested map or list — not a scalar we read.
      continue;
    } else {
      const plain = [rest, ...dedented].join(' ');
      out[key] = plain.replace(/\s+#.*$/, '').replace(/\s+/g, ' ').trim();
    }
  }
  return out;
}

function foldLines(lines: string[]): string {
  return lines
    .join('\n')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .join('\n')
    .trim();
}

function unquoteDouble(s: string): string {
  const inner = s.trim().replace(/^"/, '').replace(/"$/, '');
  return inner.replace(/\\(["\\n])/g, (_, c: string) => (c === 'n' ? '\n' : c)).replace(/\s+/g, ' ').trim();
}

function unquoteSingle(s: string): string {
  return s.trim().replace(/^'/, '').replace(/'$/, '').replace(/''/g, "'").replace(/\s+/g, ' ').trim();
}

/**
 * Turn a GitHub page link into the raw file it shows: `/blob/<ref>/<path>` →
 * raw.githubusercontent.com, `/tree/<ref>/<dir>` → that directory's SKILL.md.
 * Any other URL is returned unchanged.
 */
export function toRawSkillUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return input;
  }
  if (url.hostname !== 'github.com') return input;
  const m = /^\/([^/]+)\/([^/]+)\/(blob|tree)\/(.+)$/.exec(url.pathname);
  if (!m) return input;
  const [, owner, repo, kind, rest] = m;
  const path = kind === 'tree' ? `${rest!.replace(/\/$/, '')}/SKILL.md` : rest!;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${path}`;
}

/** SKILL.md-style name: lowercase words joined by single hyphens, max 64 chars. */
export function toSkillName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '');
}

/** Name from the URL path: the folder that holds SKILL.md, or the file stem. */
export function skillNameFromUrl(input: string): string {
  // pathname is percent-encoded ("My%20Skill"); decode before slugging.
  const segments = new URL(input).pathname
    .split('/')
    .filter(Boolean)
    .map((seg) => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    });
  const last = segments.pop() ?? '';
  const stem = /^skill\.md$/i.test(last) ? (segments.pop() ?? '') : last.replace(/\.md$/i, '');
  return toSkillName(stem) || 'imported-skill';
}

/** Where a previewed skill came from: a fetched URL or an uploaded / pasted file. */
export type ImportOrigin = { kind: 'url'; url: string } | { kind: 'file'; filename?: string };

/** Name for a file without frontmatter: the file stem (unless it is SKILL.md), else the first heading. */
export function skillNameFromFile(filename: string | undefined, body: string): string {
  const stem = (filename ?? '').split(/[\\/]/).pop()!.replace(/\.(md|markdown|txt)$/i, '');
  if (stem && !/^skill$/i.test(stem)) {
    const fromStem = toSkillName(stem);
    if (fromStem) return fromStem;
  }
  const heading = body.match(/^#{1,3}\s+(.+)$/m)?.[1] ?? '';
  return toSkillName(heading) || 'imported-skill';
}

/** Build the import preview a human reviews before third-party text is saved. */
export function buildImportPreview(origin: ImportOrigin, raw: string, type: SkillType): SkillImportPreview {
  const doc = parseSkillDoc(raw);
  const warnings: string[] = [];
  const nameAttr = doc.attributes.name ? toSkillName(doc.attributes.name) : '';
  const name =
    nameAttr || (origin.kind === 'url' ? skillNameFromUrl(origin.url) : skillNameFromFile(origin.filename, doc.body));
  const from = origin.kind === 'url' ? origin.url : (origin.filename ?? 'a pasted file');
  let description = doc.attributes.description ?? '';

  if (!doc.hasFrontmatter) {
    warnings.push(
      origin.kind === 'url'
        ? 'No YAML frontmatter — the name was derived from the URL.'
        : 'No YAML frontmatter — the name was derived from the file name or its first heading.',
    );
  }
  if (!description) {
    description = `Imported from ${from}`;
    warnings.push('No description in the frontmatter; a placeholder was used — edit it before linking.');
  }
  if (doc.body.length > LONG_BODY_WARNING_CHARS) {
    warnings.push(
      `Long body (${doc.body.length} characters): every agent that links this skill pays for it on every run.`,
    );
  }
  const steering = STEERING_PATTERNS.map((re) => re.exec(doc.body)?.[0]).filter((x): x is string => !!x);
  if (steering.length > 0) {
    warnings.push(
      `Contains text that tries to steer the reviewer (${steering.map((s) => `"${s}"`).join(', ')}). ` +
        'Skills are delimited in the prompt and cannot drop findings, but read it before importing.',
    );
  }
  return { name, description, body: doc.body, type, source_url: origin.kind === 'url' ? origin.url : null, warnings };
}

export function toSkillDto(row: SkillRow): Skill {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    source: row.source,
    body: row.body,
    enabled: row.enabled,
    version: row.version,
    evidence_files: row.evidenceFiles ?? null,
    source_url: row.sourceUrl ?? null,
    created_at: row.createdAt?.toISOString() ?? null,
  };
}
