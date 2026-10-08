/* Skill presentation shared by the Skills Lab and the agent Skills tab: type
   colours, the type order, and the name/description filter. */
import type { SkillType } from "@devdigest/shared";

/** Type → colour token + tinted background (rubric blue, convention green, security red). */
export const SKILL_TYPE_META: Record<SkillType, { c: string; bg: string }> = {
  rubric: { c: "var(--accent)", bg: "var(--accent-bg)" },
  convention: { c: "var(--ok)", bg: "var(--ok-bg)" },
  security: { c: "var(--crit)", bg: "var(--crit-bg)" },
  custom: { c: "var(--text-secondary)", bg: "var(--bg-hover)" },
};

export const SKILL_TYPES: readonly SkillType[] = ["rubric", "convention", "security", "custom"];

/** Case-insensitive match on name or description; a blank query keeps everything. */
export function filterSkills<T extends { name: string; description: string }>(skills: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return skills;
  return skills.filter((s) => s.name.includes(q) || s.description.toLowerCase().includes(q));
}
