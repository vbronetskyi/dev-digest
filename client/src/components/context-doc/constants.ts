import type { ContextFolder } from "@devdigest/shared";

/** Folder kinds in display order: what is to be built, what is known, raw notes. */
export const FOLDERS: readonly ContextFolder[] = ["specs", "docs", "insights"];

export const FOLDER_COLOR: Record<ContextFolder, { c: string; bg: string }> = {
  specs: { c: "var(--accent-text)", bg: "var(--accent-bg)" },
  docs: { c: "var(--ok)", bg: "var(--ok-bg)" },
  insights: { c: "var(--warn)", bg: "var(--warn-bg)" },
};
