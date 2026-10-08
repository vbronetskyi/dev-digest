/* RoleGroup — one Smart Diff section (core logic, wiring or boilerplate):
   a header that says how closely to read it, then its files. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { PrFile, SmartDiffRole } from "@devdigest/shared";
import { DiffViewer, type DiffCommentApi, type FileAnnotation } from "@/components/diff-viewer";
import { ROLE_COLOR } from "../../constants";
import { s, swatchFor } from "./styles";

export function RoleGroup({
  role,
  files,
  annotations,
  commenting,
}: {
  role: SmartDiffRole;
  files: PrFile[];
  annotations: Record<string, FileAnnotation>;
  commenting?: DiffCommentApi;
}) {
  const t = useTranslations("prReview");
  const label = t(`smartDiff.${role}Label`);
  return (
    <section style={s.group} aria-label={label} data-role={role}>
      <div style={s.head}>
        <span style={swatchFor(ROLE_COLOR[role])} aria-hidden />
        <span style={s.label}>{label}</span>
        <span style={s.desc}>{t(`smartDiff.${role}Desc`)}</span>
        <span className="tnum" style={s.count}>
          {t("smartDiff.filesCount", { count: files.length })}
        </span>
      </div>
      <DiffViewer files={files} commenting={commenting} annotations={annotations} />
    </section>
  );
}
