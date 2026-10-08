import type { CSSProperties } from "react";

/** Co-located styles for DocPanel. */
export const s = {
  panel: {
    flex: 1,
    minWidth: 0,
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--bg-elevated)",
    padding: "16px 24px 24px",
  } satisfies CSSProperties,
  head: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    paddingBottom: 12,
    borderBottom: "1px solid var(--border)",
  } satisfies CSSProperties,
  path: { fontSize: 13, fontWeight: 600, overflowWrap: "anywhere" } satisfies CSSProperties,
  meta: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" } satisfies CSSProperties,
  metaItem: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-muted)" } satisfies CSSProperties,
  link: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--accent-text)" } satisfies CSSProperties,
  note: { fontSize: 11.5, color: "var(--text-muted)", margin: "10px 0 16px" } satisfies CSSProperties,
} as const;
