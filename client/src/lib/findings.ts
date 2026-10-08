/* Severity counting shared by the PR list, the timeline and the review-run
   cards. Pure grouping over findings that are already loaded — never a request,
   never a model call. */
import type { Severity, SeverityCounts } from "@devdigest/shared";

/** Every severity level, most severe first — the display and filter order. */
export const SEVERITIES: readonly Severity[] = ["CRITICAL", "WARNING", "SUGGESTION"];

export function emptyCounts(): SeverityCounts {
  return { CRITICAL: 0, WARNING: 0, SUGGESTION: 0 };
}

export function countBySeverity(findings: readonly { severity: string }[]): SeverityCounts {
  const counts = emptyCounts();
  for (const f of findings) {
    if (f.severity in counts) counts[f.severity as Severity] += 1;
  }
  return counts;
}

/** Levels that have at least one finding, in severity order. */
export function presentSeverities(counts: SeverityCounts): Severity[] {
  return SEVERITIES.filter((sev) => counts[sev] > 0);
}

export function totalFindings(counts: SeverityCounts): number {
  return SEVERITIES.reduce((sum, sev) => sum + counts[sev], 0);
}
