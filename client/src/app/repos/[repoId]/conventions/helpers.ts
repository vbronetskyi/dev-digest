/** "src/a.ts:12-18" → { file, start, end }; a bare path has no range. */
export function parseEvidence(evidence: string): { file: string; start?: number; end?: number } {
  const m = evidence.match(/^(.*):(\d+)(?:-(\d+))?$/);
  if (!m) return { file: evidence };
  const start = Number(m[2]);
  return { file: m[1]!, start, end: m[3] ? Number(m[3]) : start };
}

/** Confidence bar colour: settled rules green, the rest amber (as in the design). */
export function confidenceColor(confidence: number): string {
  return confidence >= 0.85 ? "var(--ok)" : "var(--warn)";
}

/** Split text on `code` spans: odd indexes are code. Unpaired backticks stay text. */
export function splitInlineCode(text: string): string[] {
  const parts = text.split("`");
  if (parts.length % 2 === 0) return [text];
  return parts;
}
