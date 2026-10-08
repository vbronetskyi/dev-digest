import type { CSSProperties } from "react";

/** Co-located styles for CostBadge. */
export const s = {
  badge: (known: boolean): CSSProperties => ({
    fontSize: 12,
    fontWeight: known ? 500 : 400,
    color: known ? "var(--text-secondary)" : "var(--text-muted)",
    whiteSpace: "nowrap",
  }),
};
