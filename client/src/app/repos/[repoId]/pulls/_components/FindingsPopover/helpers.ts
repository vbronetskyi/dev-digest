import type { FindingRecord, ReviewRecord } from "@devdigest/shared";
import { SEVERITIES } from "@/lib/findings";
import {
  ANCHOR_GAP,
  POPOVER_MAX_HEIGHT,
  POPOVER_PREFERRED_HEIGHT,
  VIEWPORT_MARGIN,
} from "./constants";

export interface Placement {
  top?: number;
  bottom?: number;
  left: number;
  maxHeight: number;
}

/** Fixed-position placement next to the anchor: below when it fits, otherwise
 *  on whichever side has more room; always kept inside the viewport. */
export function placePopover(
  anchor: { top: number; bottom: number; left: number },
  viewport: { width: number; height: number },
  width: number,
): Placement {
  const left = Math.max(VIEWPORT_MARGIN, Math.min(anchor.left, viewport.width - width - VIEWPORT_MARGIN));
  const below = viewport.height - anchor.bottom - ANCHOR_GAP - VIEWPORT_MARGIN;
  const above = anchor.top - ANCHOR_GAP - VIEWPORT_MARGIN;
  if (below >= POPOVER_PREFERRED_HEIGHT || below >= above) {
    return { top: anchor.bottom + ANCHOR_GAP, left, maxHeight: Math.min(POPOVER_MAX_HEIGHT, below) };
  }
  return { bottom: viewport.height - anchor.top + ANCHOR_GAP, left, maxHeight: Math.min(POPOVER_MAX_HEIGHT, above) };
}

/** The newest review-kind record — the same "latest run" the list counts. */
export function latestReview(reviews: readonly ReviewRecord[]): ReviewRecord | undefined {
  return reviews
    .filter((r) => r.kind === "review")
    .reduce<ReviewRecord | undefined>(
      (latest, r) => (!latest || r.created_at > latest.created_at ? r : latest),
      undefined,
    );
}

/** Findings ordered most severe first, matching the run card's order. */
export function bySeverity(findings: readonly FindingRecord[]): FindingRecord[] {
  return [...findings].sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity));
}

/** "src/a.ts:12" or "src/a.ts:12-18". */
export function locationOf(f: Pick<FindingRecord, "file" | "start_line" | "end_line">): string {
  return f.start_line === f.end_line ? `${f.file}:${f.start_line}` : `${f.file}:${f.start_line}-${f.end_line}`;
}

/** Rationale as plain text for a two-line preview (drops bold/code markers). */
export function plainText(markdown: string): string {
  return markdown.replace(/\*\*|`/g, "").replace(/\s+/g, " ").trim();
}
