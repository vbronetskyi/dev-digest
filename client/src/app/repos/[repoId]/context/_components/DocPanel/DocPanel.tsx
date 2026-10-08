/* DocPanel — the selected document: path, folder, size, how many agents attach
   it, a link to it on GitHub, and its committed content as safe Markdown. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@devdigest/ui";
import type { ContextDoc } from "@devdigest/shared";
import { ContextDocView, FolderChip, formatTokens } from "@/components/context-doc";
import { githubBlobUrl } from "@/lib/github-urls";
import { s } from "./styles";

export function DocPanel({ repoId, repoFullName, branch, doc }: { repoId: string; repoFullName: string | null; branch: string; doc: ContextDoc }) {
  const t = useTranslations("context");
  return (
    <article style={s.panel} aria-label={doc.path}>
      <header style={s.head}>
        <span className="mono" style={s.path}>
          {doc.path}
        </span>
        <FolderChip folder={doc.folder} />
        <span style={s.meta}>
          <span style={s.metaItem}>
            <Icon.Cpu size={12} aria-hidden />
            {t("doc.usedBy", { count: doc.used_by })}
          </span>
          <span className="mono" style={s.metaItem}>
            {t("doc.tokens", { tokens: formatTokens(doc.tokens) })}
          </span>
          {repoFullName && (
            <a href={githubBlobUrl(repoFullName, branch, doc.path)} target="_blank" rel="noreferrer" style={s.link}>
              <Icon.ExternalLink size={12} aria-hidden />
              {t("doc.openOnGitHub")}
            </a>
          )}
        </span>
      </header>
      <p style={s.note}>{t("doc.untrustedNote", { branch })}</p>
      <ContextDocView repoId={repoId} path={doc.path} />
    </article>
  );
}
