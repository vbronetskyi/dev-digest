import type { IconName } from "@devdigest/ui";

/** Section icon by kind; an unknown kind falls back to FileText. */
export const SECTION_ICON: Record<string, IconName> = {
  architecture: "Boxes",
  critical_paths: "Activity",
  how_to_run: "Command",
  reading_path: "ListChecks",
  first_tasks: "Target",
};
