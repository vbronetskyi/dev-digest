import type { CSSProperties } from "react";

/** Co-located styles for DiffTab. */
export const s = {
  toolbar: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 } satisfies CSSProperties,
  orders: { display: "flex", gap: 4 } satisfies CSSProperties,
  meta: { marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" } satisfies CSSProperties,
  metaStale: { color: "var(--warn)" } satisfies CSSProperties,
} as const;
