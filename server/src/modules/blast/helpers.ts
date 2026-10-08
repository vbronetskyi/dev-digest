import type { BlastRadius, DownstreamImpact } from '@devdigest/shared';

/**
 * Lines of the OLD (base) file a patch touches: removed lines, plus the line an
 * insertion lands after. The index describes the base commit, so these — not
 * the new-side numbers — are what symbol ranges can be compared against.
 */
export function touchedBaseLines(patch: string): number[] {
  const out = new Set<number>();
  let old = 0;
  for (const line of patch.split('\n')) {
    const header = line.match(/^@@ -(\d+)(?:,(\d+))? \+\d+(?:,\d+)? @@/);
    if (header) {
      old = Number(header[1]);
      continue;
    }
    if (old === 0) continue;
    if (line.startsWith('-')) {
      out.add(old);
      old++;
    } else if (line.startsWith('+')) {
      // Inserted between old-1 and old: attribute to the line it follows.
      out.add(Math.max(1, old - 1));
    } else if (!line.startsWith('\\')) {
      old++;
    }
  }
  return [...out].sort((a, b) => a - b);
}

export interface SymbolInFile {
  file: string;
  name: string;
  kind: string;
  line?: number | null;
  endLine?: number | null;
}

/**
 * Symbols whose declaration range contains a touched line. A symbol without a
 * range is kept only when its file was touched at all — better a false positive
 * than silently dropping it.
 */
export function touchedSymbols<S extends SymbolInFile>(symbols: S[], touched: ReadonlyMap<string, number[]>): S[] {
  return symbols.filter((s) => {
    const lines = touched.get(s.file);
    if (!lines || lines.length === 0) return false;
    if (s.line == null) return true;
    const end = s.endLine ?? s.line;
    return lines.some((l) => l >= s.line! && l <= end);
  });
}

/**
 * Routes the indexer read from template literals keep the placeholder
 * ("POST /findings/:id/${action}"); show it as the path parameter it is.
 */
export function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g, ':$1');
}

export function summarize(changed: number, downstream: DownstreamImpact[]): string {
  if (changed === 0) return 'No indexed symbol is touched by this PR.';
  const callers = downstream.reduce((n, d) => n + d.callers.length, 0);
  const endpoints = new Set(downstream.flatMap((d) => d.endpoints_affected)).size;
  const crons = new Set(downstream.flatMap((d) => d.crons_affected)).size;
  const parts = [`${callers} caller${callers === 1 ? '' : 's'}`, `${endpoints} endpoint${endpoints === 1 ? '' : 's'}`];
  if (crons > 0) parts.push(`${crons} cron${crons === 1 ? '' : 's'}`);
  return `${changed} symbol${changed === 1 ? '' : 's'} changed → ${parts.join(', ')}`;
}

export function degradedResult(
  reason: NonNullable<BlastRadius['degraded']>['reason'],
  message: string,
  durationMs: number,
): BlastRadius {
  return { changed_symbols: [], downstream: [], summary: message, degraded: { reason, message }, duration_ms: durationMs };
}
