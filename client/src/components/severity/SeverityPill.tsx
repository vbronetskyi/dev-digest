/* SeverityPill — "2 CRITICAL" summary chip, number first, used in the
   review-run card's count row. */
import React from "react";
import { Icon, SEV } from "@devdigest/ui";
import type { Severity } from "@devdigest/shared";
import { s } from "./styles";

export function SeverityPill({ severity, count, label }: { severity: Severity; count: number; label: string }) {
  const meta = SEV[severity];
  const I = Icon[meta.icon];
  return (
    <span style={s.pill(meta.c, meta.bg)} data-severity={severity}>
      <I size={12.5} aria-hidden />
      <span className="tnum">{count}</span>
      {label}
    </span>
  );
}

export default SeverityPill;
