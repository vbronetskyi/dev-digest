import type { IconName } from "@devdigest/ui";
import type { SkillSource } from "@devdigest/shared";

/** Constants for the Skills Lab (/skills). */

export const SKILL_SOURCE_ICON: Record<SkillSource, IconName> = {
  manual: "Edit",
  imported_url: "Link",
  imported_file: "Upload",
  extracted: "Wrench",
  community: "Globe",
};

/** Sources whose text came from outside the workspace and must be vetted before use. */
export const UNTRUSTED_SOURCES: readonly SkillSource[] = ["imported_url", "imported_file", "community"];

/** Editor tabs, in order. Evals arrive with the eval pipeline (L06). */
export const EDITOR_TABS: readonly { key: string; icon: IconName }[] = [
  { key: "config", icon: "Settings" },
  { key: "preview", icon: "Eye" },
  { key: "stats", icon: "BarChart" },
  { key: "versions", icon: "History" },
];

/** `?skill=new` opens the create form in the editor pane. */
export const NEW_SKILL = "new";

/** Rough chars-per-token ratio for the body cost hint (English/markdown). */
export const CHARS_PER_TOKEN = 4;

/** Import drawer tabs. Community search needs a curated catalog and is not built. */
export const IMPORT_MODES = ["file", "url"] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];
