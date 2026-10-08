import type { BlastRadius } from "@devdigest/shared";

export function blastStats(b: BlastRadius) {
  return {
    symbols: b.changed_symbols.length,
    callers: b.downstream.reduce((n, d) => n + d.callers.length, 0),
    endpoints: new Set(b.downstream.flatMap((d) => d.endpoints_affected)).size,
    crons: new Set(b.downstream.flatMap((d) => d.crons_affected)).size,
  };
}

/** Graph layout: callers spread over the height, endpoints in a third column. */
export function columnY(index: number, count: number, height: number, pad = 28): number {
  if (count <= 1) return height / 2;
  return pad + (index * (height - pad * 2)) / (count - 1);
}

export const shorten = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
