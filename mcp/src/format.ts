/** Compact, token-cheap shapes for tool results: only what an agent acts on. */
import type { FindingRecord, RunResult } from "@devdigest/shared";

const RATIONALE_CHARS = 400;
const SUGGESTION_CHARS = 240;
const SEVERITY_ORDER = { CRITICAL: 0, WARNING: 1, SUGGESTION: 2 } as const;

const clip = (s: string | null | undefined, n: number) =>
  !s ? undefined : s.length > n ? `${s.slice(0, n - 1)}…` : s;

export function compactFinding(f: FindingRecord) {
  return {
    severity: f.severity,
    title: f.title,
    where: f.end_line && f.end_line !== f.start_line ? `${f.file}:${f.start_line}-${f.end_line}` : `${f.file}:${f.start_line}`,
    category: f.category,
    confidence: f.confidence,
    why: clip(f.rationale, RATIONALE_CHARS),
    fix: clip(f.suggestion, SUGGESTION_CHARS),
  };
}

/** The run as an agent needs it. `findings` is most severe first. */
export function compactRun(r: RunResult) {
  const findings = [...(r.review?.findings ?? [])]
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .map(compactFinding);
  const counts = { CRITICAL: 0, WARNING: 0, SUGGESTION: 0 };
  for (const f of findings) counts[f.severity]++;
  return {
    run_id: r.run.run_id,
    pr: `${r.repo}#${r.pr_number}`,
    agent: r.run.agent_name,
    status: r.run.status,
    ...(r.run.error ? { error: r.run.error } : {}),
    verdict: r.review?.verdict ?? null,
    score: r.run.score,
    blockers: r.run.blockers,
    counts,
    summary: clip(r.review?.summary, 600) ?? null,
    cost_usd: r.run.cost_usd,
    findings,
  };
}
