import type { SkillSource } from "@devdigest/shared";
import { CHARS_PER_TOKEN, UNTRUSTED_SOURCES } from "./constants";

/** Approximate prompt cost of a body — enough to tell 200 tokens from 5 000. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Third-party skill that nobody has enabled yet — shown as "needs vetting". */
export function needsVetting(skill: { source: SkillSource; enabled: boolean }): boolean {
  return UNTRUSTED_SOURCES.includes(skill.source) && !skill.enabled;
}

/**
 * The block the reviewer receives for this skill. Mirrors `wrapSkill` in
 * reviewer-core/src/prompt.ts (the source of truth) — keep the two in step.
 */
export function promptBlock(name: string, body: string): string {
  const safeBody = body.replaceAll("</skill", "<\\/skill");
  const safeName = name.replace(/[^a-z0-9._-]/gi, "-");
  return `<skill name="${safeName}">\n${safeBody}\n</skill>`;
}

export type DiffLine = { kind: "same" | "add" | "del"; text: string };

/** Line diff via longest common subsequence — skill bodies are short, O(n·m) is fine. */
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", text: a[i]! });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      out.push({ kind: "del", text: a[i++]! });
    } else {
      out.push({ kind: "add", text: b[j++]! });
    }
  }
  while (i < a.length) out.push({ kind: "del", text: a[i++]! });
  while (j < b.length) out.push({ kind: "add", text: b[j++]! });
  return out;
}
