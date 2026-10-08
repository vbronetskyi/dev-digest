import type { ContextFolder, TrackedFile } from '@devdigest/shared';

/**
 * SPEC-01 Project Context Folder — the pure part, shared by the context module
 * (listing, preview) and the review run (packing documents into the prompt).
 */

const CONTEXT_FOLDERS: readonly ContextFolder[] = ['specs', 'docs', 'insights'];
/** Total budget for one agent's documents in a review prompt. */
export const CONTEXT_TOKEN_BUDGET = 8000;
export const CHARS_PER_TOKEN = 4;
const CUT_MARKER = '\n\n[… cut at the project-context budget]';

export interface ContextDocMeta {
  path: string;
  folder: ContextFolder;
  name: string;
  bytes: number;
  tokens: number;
}

export function estimateTokens(chars: number): number {
  return Math.ceil(chars / CHARS_PER_TOKEN);
}

/**
 * The folder kind of a Markdown path: the deepest `specs` / `docs` / `insights`
 * directory on it (monorepos keep them per package). Null for anything else.
 */
export function contextFolderOf(path: string): ContextFolder | null {
  if (!path.toLowerCase().endsWith('.md')) return null;
  const dirs = path.split('/').slice(0, -1);
  if (dirs.includes('node_modules')) return null;
  for (let i = dirs.length - 1; i >= 0; i--) {
    const kind = CONTEXT_FOLDERS.find((f) => f === dirs[i]);
    if (kind) return kind;
  }
  return null;
}

/** The context documents among the committed files: specs first, then docs, then insights. */
export function contextDocsFrom(files: readonly TrackedFile[]): ContextDocMeta[] {
  return files
    .flatMap((f) => {
      const folder = contextFolderOf(f.path);
      if (!folder) return [];
      return [{ path: f.path, folder, name: f.path.slice(f.path.lastIndexOf('/') + 1), bytes: f.bytes, tokens: estimateTokens(f.bytes) }];
    })
    .sort((a, b) => CONTEXT_FOLDERS.indexOf(a.folder) - CONTEXT_FOLDERS.indexOf(b.folder) || a.path.localeCompare(b.path));
}

export interface PackedContext {
  /** One block per document, each starting with its path, in the given order. */
  blocks: string[];
  /** Paths that went into the prompt (in full or cut). */
  read: string[];
  /** The document cut at the budget, if any. */
  cut: string | null;
  /** Documents left out because the budget was spent. */
  skipped: string[];
}

/**
 * Fit documents into the budget in order: whole while they fit, the first one
 * that does not is cut at the budget, everything after it is skipped.
 */
export function packContext(docs: readonly { path: string; body: string }[], budgetTokens = CONTEXT_TOKEN_BUDGET): PackedContext {
  const out: PackedContext = { blocks: [], read: [], cut: null, skipped: [] };
  let left = budgetTokens * CHARS_PER_TOKEN;
  for (const doc of docs) {
    const text = `Source: ${doc.path}\n\n${doc.body.trim()}`;
    if (out.cut !== null || left <= 0) {
      out.skipped.push(doc.path);
    } else if (text.length <= left) {
      out.blocks.push(text);
      out.read.push(doc.path);
      left -= text.length;
    } else {
      out.blocks.push(text.slice(0, left) + CUT_MARKER);
      out.read.push(doc.path);
      out.cut = doc.path;
      left = 0;
    }
  }
  return out;
}
