/* CostBadge — USD cost of a run or a PR in mono tabular figures. Unknown cost
   reads "—" in a muted tone, so a run without billing data never looks free. */
import React from "react";
import { formatCost } from "@/lib/format-cost";
import { s } from "./styles";

export function CostBadge({ usd, title }: { usd: number | null | undefined; title?: string }) {
  const known = usd != null && Number.isFinite(usd);
  return (
    <span className="mono tnum" style={s.badge(known)} title={known ? title : undefined}>
      {formatCost(usd)}
    </span>
  );
}

export default CostBadge;
