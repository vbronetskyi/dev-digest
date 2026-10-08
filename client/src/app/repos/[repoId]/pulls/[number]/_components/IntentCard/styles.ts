import type { CSSProperties } from "react";

/** Co-located styles for IntentCard. */
export const s = {
  card: { border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-elevated)", padding: 18 } satisfies CSSProperties,
  quote: { fontSize: 14, lineHeight: 1.5, fontStyle: "italic", color: "var(--text-primary)", margin: "0 0 14px" } satisfies CSSProperties,
  cols: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 } satisfies CSSProperties,
  colHead: (color: string): CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    color,
    marginBottom: 7,
  }),
  list: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 } satisfies CSSProperties,
  item: (muted: boolean): CSSProperties => ({ fontSize: 12.5, lineHeight: 1.45, display: "flex", gap: 7, color: muted ? "var(--text-muted)" : "var(--text-secondary)" }),
  none: { fontSize: 12.5, color: "var(--text-muted)" } satisfies CSSProperties,
  foot: { display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" } satisfies CSSProperties,
  meta: { fontSize: 11.5, color: "var(--text-muted)", flex: 1 } satisfies CSSProperties,
  stale: { fontSize: 12, color: "var(--warn)", background: "var(--warn-bg)", borderRadius: 6, padding: "6px 10px", marginTop: 12 } satisfies CSSProperties,
  empty: { fontSize: 13, color: "var(--text-secondary)", margin: 0, flex: 1 } satisfies CSSProperties,
  error: { fontSize: 12.5, color: "var(--crit)", marginTop: 10 } satisfies CSSProperties,
} as const;
