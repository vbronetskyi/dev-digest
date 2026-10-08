import type { ContextDoc, ContextFolder } from "@devdigest/shared";
import { FOLDERS } from "./constants";

/** 950 → "950", 1200 → "1.2K", 4000 → "4K". */
export function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(n);
}

/** The directory part of a repo path ("" at the root). */
export function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i + 1);
}

/** Non-empty folder groups, in FOLDERS order, keeping the server's order inside each. */
export function groupByFolder<D extends Pick<ContextDoc, "folder">>(docs: readonly D[]): { folder: ContextFolder; docs: D[] }[] {
  return FOLDERS.map((folder) => ({ folder, docs: docs.filter((d) => d.folder === folder) })).filter((g) => g.docs.length > 0);
}
