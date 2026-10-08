/* FindingsCell — the PR list FINDINGS column: icon + count per severity of the
   latest review run. Hover or focus opens the read-only FindingsPopover. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { SeverityCounts } from "@devdigest/shared";
import { SeverityCount } from "@/components/severity";
import { presentSeverities, totalFindings } from "@/lib/findings";
import { FindingsPopover } from "../FindingsPopover";
import { POPOVER_ATTR } from "../FindingsPopover/constants";
import { CLOSE_DELAY_MS } from "./constants";
import { s } from "./styles";

type Anchor = { top: number; bottom: number; left: number };

export function FindingsCell({ prId, counts }: { prId?: string | null; counts?: SeverityCounts | null }) {
  const t = useTranslations("prReview");
  const ref = React.useRef<HTMLDivElement | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [anchor, setAnchor] = React.useState<Anchor | null>(null);

  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);
  const scheduleClose = React.useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setAnchor(null), CLOSE_DELAY_MS);
  }, [cancelClose]);
  const open = React.useCallback(() => {
    cancelClose();
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setAnchor({ top: rect.top, bottom: rect.bottom, left: rect.left });
  }, [cancelClose]);

  React.useEffect(() => cancelClose, [cancelClose]);

  // The popover is fixed-positioned, so page scroll would detach it from the
  // cell: close it then — but not when the user scrolls the popover's own list.
  React.useEffect(() => {
    if (!anchor) return;
    const onScroll = (e: Event) => {
      const target = e.target as Element | null;
      if (target && typeof target.closest === "function" && target.closest(`[${POPOVER_ATTR}]`)) return;
      setAnchor(null);
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [anchor]);

  const present = counts ? presentSeverities(counts) : [];
  if (!prId || !counts || present.length === 0) return <span style={s.empty}>—</span>;
  const total = totalFindings(counts);

  return (
    <div
      ref={ref}
      tabIndex={0}
      aria-label={t("list.findingsCellLabel", { count: total })}
      style={s.cell}
      onMouseEnter={open}
      onMouseLeave={scheduleClose}
      onFocus={open}
      onBlur={scheduleClose}
    >
      {present.map((sev) => (
        <SeverityCount key={sev} severity={sev} count={counts[sev]} label={t(`panel.severity.${sev}`)} />
      ))}
      {anchor && (
        <FindingsPopover
          prId={prId}
          total={total}
          anchor={anchor}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </div>
  );
}

export default FindingsCell;
