import type { CSSProperties } from "react";

/** Co-located styles for FindingsCell. */
export const s = {
  cell: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    width: "fit-content",
    cursor: "help",
    outline: "none",
  } satisfies CSSProperties,
  empty: { fontSize: 12, color: "var(--text-muted)" } satisfies CSSProperties,
};
