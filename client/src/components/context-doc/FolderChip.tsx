import React from "react";
import type { ContextFolder } from "@devdigest/shared";
import { FOLDER_COLOR } from "./constants";
import { chipFor } from "./styles";

/** The folder kind as on disk ("specs", "docs", "insights") — a path fact, not translated. */
export function FolderChip({ folder }: { folder: ContextFolder }) {
  const { c, bg } = FOLDER_COLOR[folder];
  return <span style={chipFor(c, bg)}>{folder}</span>;
}
