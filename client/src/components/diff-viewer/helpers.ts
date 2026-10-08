/** Pure helpers for the DiffViewer. */
import type { Severity, SmartDiffFinding } from "@devdigest/shared";
import { HUNK_HEADER_RE } from "./constants";

export interface Line {
  kind: "add" | "del" | "ctx" | "hunk";
  text: string;
  oldNo?: number;
  newNo?: number;
}

/** Parse unified-diff patch text into renderable lines with old/new line numbers. */
export function parsePatch(patch: string | null | undefined): Line[] {
  if (!patch) return [];
  const out: Line[] = [];
  let oldNo = 0;
  let newNo = 0;
  for (const raw of patch.split("\n")) {
    if (raw.startsWith("@@")) {
      const m = raw.match(HUNK_HEADER_RE);
      if (m) {
        oldNo = parseInt(m[1]!, 10);
        newNo = parseInt(m[2]!, 10);
      }
      out.push({ kind: "hunk", text: raw });
    } else if (raw.startsWith("+")) {
      out.push({ kind: "add", text: raw.slice(1), newNo });
      newNo++;
    } else if (raw.startsWith("-")) {
      out.push({ kind: "del", text: raw.slice(1), oldNo });
      oldNo++;
    } else {
      out.push({ kind: "ctx", text: raw.slice(raw.startsWith(" ") ? 1 : 0), oldNo, newNo });
      oldNo++;
      newNo++;
    }
  }
  return out;
}

/** Smart Diff extras for one file: finding markers, a role note, the initial fold. */
export interface FileAnnotation {
  findings: SmartDiffFinding[];
  /** Short muted label in the file header, e.g. "lockfile". */
  note?: string;
  /** Overrides the size-based default fold. */
  defaultOpen?: boolean;
}

/** What a diff line shows for the findings covering it. */
export interface LineMark {
  /** The most severe finding covering the line — colours the gutter bar. */
  severity: Severity;
  /** Findings that start on this line, most severe first — labelled at the line end. */
  starting: SmartDiffFinding[];
}

const SEVERITY_RANK: Record<Severity, number> = { CRITICAL: 0, WARNING: 1, SUGGESTION: 2 };

export function bySeverity(a: { severity: Severity }, b: { severity: Severity }): number {
  return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
}

/** Findings sit on new-side line numbers, so removed lines and hunk headers never carry a mark. */
export function markFor(ln: Line, findings: readonly SmartDiffFinding[]): LineMark | null {
  if (ln.kind === "del" || ln.kind === "hunk" || ln.newNo === undefined) return null;
  const n = ln.newNo;
  const covering = findings.filter((f) => f.start_line <= n && n <= f.end_line).sort(bySeverity);
  if (covering.length === 0) return null;
  return { severity: covering[0]!.severity, starting: covering.filter((f) => f.start_line === n) };
}
