/* DiffViewer — basic GitHub-style unified diff viewer. Renders real PrFile.patch
   (unified-diff text from the F1 API) as a list of collapsible FileCards.
   Optional inline comments (Files changed tab): hover a line → "+" → comment,
   posted live to GitHub; existing GitHub review comments render inline.
   Optional per-file annotations (Smart Diff): finding markers, a role note,
   the initial fold. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { PrFile } from "@/lib/types";
import { type DiffCommentApi } from "../comments";
import type { FileAnnotation } from "../helpers";
import { s } from "../styles";
import { FileCard } from "../FileCard";

export function DiffViewer({
  files,
  commenting,
  annotations,
}: {
  files: PrFile[];
  commenting?: DiffCommentApi;
  /** Keyed by file path. */
  annotations?: Record<string, FileAnnotation>;
}) {
  const t = useTranslations("shell");
  if (!files || files.length === 0) {
    return <div style={s.empty}>{t("diffViewer.noChangedFiles")}</div>;
  }
  return (
    <div style={s.list}>
      {files.map((f, i) => (
        <FileCard key={f.path || i} file={f} commenting={commenting} annotation={annotations?.[f.path]} />
      ))}
    </div>
  );
}
