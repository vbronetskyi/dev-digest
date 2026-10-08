/* SeverityCount — compact "icon + number" for one severity, in that severity's
   colour. Used where space is tight: PR list FINDINGS column, timeline tiles. */
import React from "react";
import { Icon, SEV } from "@devdigest/ui";
import type { Severity } from "@devdigest/shared";
import { s } from "./styles";

export function SeverityCount({ severity, count, label }: { severity: Severity; count: number; label: string }) {
  const meta = SEV[severity];
  const I = Icon[meta.icon];
  return (
    <span style={s.count(meta.c)} aria-label={`${count} ${label}`} title={`${count} ${label}`}>
      <I size={12} aria-hidden />
      <span className="tnum">{count}</span>
    </span>
  );
}

export default SeverityCount;
