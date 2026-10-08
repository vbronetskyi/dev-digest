/* ContextDocView — one project-context document as committed on the default
   branch, rendered as safe Markdown (no raw HTML, http(s) links only, no images). */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ErrorState, Markdown, Skeleton } from "@devdigest/ui";
import { useContextDoc } from "@/lib/hooks/context";
import { ApiError } from "@/lib/api";
import { s } from "./styles";

export function ContextDocView({ repoId, path }: { repoId: string; path: string }) {
  const t = useTranslations("context");
  const { data, isLoading, isError, error, refetch } = useContextDoc(repoId, path);
  if (isLoading) return <Skeleton height={220} />;
  if (isError || !data) {
    return <ErrorState title={t("doc.loadError")} body={error instanceof ApiError ? error.message : undefined} onRetry={() => refetch()} />;
  }
  return (
    <div style={s.body} data-testid="context-doc-body">
      <Markdown safe>{data.body}</Markdown>
    </div>
  );
}
