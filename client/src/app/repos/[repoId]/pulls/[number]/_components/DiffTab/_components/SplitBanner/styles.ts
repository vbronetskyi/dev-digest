import type { CSSProperties } from "react";

/** Co-located styles for SplitBanner. */
export const s = {
  banner: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    border: "1px solid var(--warn)",
    borderRadius: 8,
    background: "var(--warn-bg)",
    padding: 14,
    marginBottom: 16,
  } satisfies CSSProperties,
  icon: { color: "var(--warn)", flexShrink: 0, marginTop: 1 } satisfies CSSProperties,
  body: { flex: 1, minWidth: 0 } satisfies CSSProperties,
  title: { fontSize: 13.5, fontWeight: 650, color: "var(--text-primary)" } satisfies CSSProperties,
  text: { fontSize: 12.5, color: "var(--text-secondary)", margin: "6px 0 0" } satisfies CSSProperties,
  list: { listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexDirection: "column", gap: 6 } satisfies CSSProperties,
  item: { display: "flex", alignItems: "baseline", gap: 8, minWidth: 0, fontSize: 12.5, color: "var(--text-secondary)" } satisfies CSSProperties,
  name: { color: "var(--text-primary)", fontWeight: 600, whiteSpace: "nowrap" } satisfies CSSProperties,
  count: { color: "var(--text-muted)", whiteSpace: "nowrap" } satisfies CSSProperties,
  paths: { fontSize: 11.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } satisfies CSSProperties,
} as const;
