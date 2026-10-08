import type { BlastRadius, DownstreamImpact } from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import { NotFoundError } from '../../platform/errors.js';
import { BlastRepository } from './repository.js';
import { DEGRADED_MESSAGES, MAX_CALLERS_SHOWN } from './constants.js';
import { degradedResult, summarize, touchedBaseLines, touchedSymbols } from './helpers.js';

/**
 * What a PR can break, read from the repo-intel index: the symbols its hunks
 * touch, who calls them, and the endpoints / crons in the touched and calling
 * files. No model call and no analysis at request time.
 */
export class BlastService {
  private repo: BlastRepository;

  constructor(private container: Container) {
    this.repo = new BlastRepository(container.db);
  }

  async forPull(workspaceId: string, prId: string): Promise<BlastRadius> {
    const started = performance.now();
    const elapsed = () => Math.round(performance.now() - started);
    const pull = await this.repo.pullWithFiles(workspaceId, prId);
    if (!pull) throw new NotFoundError('Pull request not found');

    if (!this.container.config.repoIntelEnabled) {
      return degradedResult('flag_off', DEGRADED_MESSAGES.flag_off, elapsed());
    }
    // Only a built index is acceptable: the facade's fallback scans the clone,
    // which is exactly the request-time analysis this endpoint must not do.
    const state = await this.container.repoIntel.getIndexState(pull.repoId);
    if (state.status !== 'full' && state.status !== 'partial') {
      return degradedResult('not_indexed', DEGRADED_MESSAGES.not_indexed, elapsed());
    }
    const touched = new Map(
      pull.files.filter((f) => f.patch).map((f) => [f.path, touchedBaseLines(f.patch!)] as const),
    );
    if (touched.size === 0) {
      return degradedResult('no_files', DEGRADED_MESSAGES.no_files, elapsed());
    }

    const blast = await this.container.repoIntel.getBlastRadius(pull.repoId, [...touched.keys()]);
    const changed = touchedSymbols(blast.changedSymbols, touched);
    const facts = blast.factsByFile ?? {};
    const downstream: DownstreamImpact[] = changed.map((sym) => {
      const callers = blast.callers.filter((c) => c.viaSymbol === sym.name).slice(0, MAX_CALLERS_SHOWN);
      // The symbol's own file counts too: a changed route handler affects the
      // routes it declares even when nothing resolves as its caller.
      const files = [sym.file, ...callers.map((c) => c.file)];
      return {
        symbol: sym.name,
        callers: callers.map((c) => ({ name: c.symbol, file: c.file, line: c.line })),
        endpoints_affected: [...new Set(files.flatMap((f) => facts[f]?.endpoints ?? []))],
        crons_affected: [...new Set(files.flatMap((f) => facts[f]?.crons ?? []))],
      };
    });

    return {
      changed_symbols: changed.map((s) => ({ name: s.name, file: s.file, kind: s.kind, line: s.line ?? null })),
      downstream,
      summary: summarize(changed.length, downstream),
      indexed_sha: state.lastIndexedSha ?? null,
      duration_ms: elapsed(),
    };
  }
}
