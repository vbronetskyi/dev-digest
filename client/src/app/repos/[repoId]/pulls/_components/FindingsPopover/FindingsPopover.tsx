/* FindingsPopover — read-only preview of the latest run's findings, opened by
   hovering the FINDINGS cell in the PR list. Rendered into document.body with
   fixed positioning because the table card clips overflow. Text only: no
   actions live here — accepting or dismissing happens on the PR page. */
"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Icon, SeverityBadge, CategoryTag, ConfidenceNum } from "@devdigest/ui";
import { usePrReviews } from "@/lib/hooks/reviews";
import { POPOVER_ATTR, POPOVER_WIDTH } from "./constants";
import { bySeverity, latestReview, locationOf, placePopover, plainText } from "./helpers";
import { s } from "./styles";

export function FindingsPopover({
  prId,
  total,
  anchor,
  onMouseEnter,
  onMouseLeave,
}: {
  prId: string;
  /** Count from the list payload, shown while the findings load. */
  total: number;
  anchor: { top: number; bottom: number; left: number };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const t = useTranslations("prReview");
  const { data, isLoading, isError } = usePrReviews(prId);
  const review = data ? latestReview(data) : undefined;
  const findings = review ? bySeverity(review.findings) : [];
  const place = placePopover(anchor, { width: window.innerWidth, height: window.innerHeight }, POPOVER_WIDTH);

  return createPortal(
    <div
      role="tooltip"
      {...{ [POPOVER_ATTR]: "" }}
      style={s.popover(place, POPOVER_WIDTH)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div style={s.header}>
        <Icon.AlertOctagon size={12} aria-hidden />
        {t("list.findingsPopover.title", { count: review ? findings.length : total })}
      </div>
      {isLoading ? (
        <div style={s.status}>{t("list.findingsPopover.loading")}</div>
      ) : isError ? (
        <div style={s.status}>{t("list.findingsPopover.error")}</div>
      ) : (
        <div style={s.list(place.maxHeight)}>
          {findings.map((f, i) => (
            <div key={f.id} style={s.item(i === findings.length - 1)}>
              <div style={s.itemHead}>
                <SeverityBadge severity={f.severity} compact />
                <span style={s.title}>{f.title}</span>
                <CategoryTag category={f.category} />
              </div>
              <div style={s.meta}>
                <span className="mono" style={s.location} title={locationOf(f)}>
                  {locationOf(f)}
                </span>
                <span style={s.confidence}>
                  <ConfidenceNum value={f.confidence} />
                </span>
              </div>
              <div style={s.rationale}>{plainText(f.rationale)}</div>
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

export default FindingsPopover;
