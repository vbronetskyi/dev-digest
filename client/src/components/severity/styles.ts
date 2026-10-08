import type { CSSProperties } from "react";

/** Co-located styles for the severity count primitives. */
export const s = {
  count: (color: string): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    fontSize: 11.5,
    fontWeight: 600,
    color,
    borderBottom: `1px dotted ${color}`,
    paddingBottom: 1,
  }),
  pill: (color: string, bg: string): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 9px",
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 600,
    color,
    background: bg,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  }),
  row: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  } satisfies CSSProperties,
};
