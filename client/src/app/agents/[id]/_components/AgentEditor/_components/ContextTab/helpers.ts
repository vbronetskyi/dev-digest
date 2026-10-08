import type { ContextDoc } from "@devdigest/shared";

/** Case-insensitive match on the whole path, so "specs/" or "api" both narrow the list. */
export function filterDocs<D extends Pick<ContextDoc, "path">>(docs: readonly D[], query: string): D[] {
  const q = query.trim().toLowerCase();
  return q ? docs.filter((d) => d.path.toLowerCase().includes(q)) : [...docs];
}

/** Tokens of the attached documents this repository has; missing ones count as 0. */
export function attachedTokens(paths: readonly string[], byPath: ReadonlyMap<string, Pick<ContextDoc, "tokens">>): number {
  return paths.reduce((n, p) => n + (byPath.get(p)?.tokens ?? 0), 0);
}

export function baseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}
