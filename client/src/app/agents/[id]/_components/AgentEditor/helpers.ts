/* Helpers for the agent editor: the tab in the URL, and moving items in the ordered tabs. */
import { TABS } from "./constants";

/** The `?tab=` value if it names an editor tab, else Config. One list: TABS. */
export function editorTab(param: string | null): string {
  return TABS.some((tb) => tb.key === param) ? param! : "config";
}

/** Move one element; returns a new array. Out-of-range indexes return the input unchanged. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}
