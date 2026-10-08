/* SplitBanner — shown when a PR has more reviewable lines than a reviewer
   handles well: the proposed slices, or why there is no clean cut. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@devdigest/ui";
import type { SmartDiff } from "@devdigest/shared";
import { SPLIT_FILES_SHOWN } from "../../constants";
import { shortPath } from "../../helpers";
import { s } from "./styles";

export function SplitBanner({ split }: { split: SmartDiff["split_suggestion"] }) {
  const t = useTranslations("prReview");
  if (!split.too_big) return null;
  return (
    <div style={s.banner} role="note">
      <Icon.AlertTriangle size={18} style={s.icon} aria-hidden />
      <div style={s.body}>
        <div style={s.title}>
          {t("smartDiff.largeTitle", { reviewable: split.reviewable_lines ?? split.total_lines, total: split.total_lines })}
        </div>
        {split.proposed_splits.length === 0 ? (
          <p style={s.text}>{t("smartDiff.noCleanSplit")}</p>
        ) : (
          <>
            <p style={s.text}>{t("smartDiff.largeBody")}</p>
            <ul style={s.list}>
              {split.proposed_splits.map((sp) => {
                const more = sp.files.length - SPLIT_FILES_SHOWN;
                return (
                  <li key={sp.name} style={s.item}>
                    <b className="mono" style={s.name}>
                      {sp.name}
                    </b>
                    <span className="tnum" style={s.count}>
                      {t("smartDiff.filesCount", { count: sp.files.length })}
                    </span>
                    <span className="mono" style={s.paths} title={sp.files.join("\n")}>
                      {sp.files.slice(0, SPLIT_FILES_SHOWN).map(shortPath).join(", ")}
                      {more > 0 && ` ${t("smartDiff.moreFiles", { count: more })}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
