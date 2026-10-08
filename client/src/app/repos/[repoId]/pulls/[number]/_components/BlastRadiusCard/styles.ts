import type { CSSProperties } from "react";

/** Co-located styles for BlastRadiusCard and its tree / graph views. */
export const s = {
  card: { border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-elevated)", padding: 18 } satisfies CSSProperties,
  head: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 12 } satisfies CSSProperties,
  stat: { display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-secondary)", fontSize: 12.5 } satisfies CSSProperties,
  statNum: { color: "var(--text-primary)", fontWeight: 650 } satisfies CSSProperties,
  views: { marginLeft: "auto", display: "flex", gap: 4 } satisfies CSSProperties,
  summary: { fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 } satisfies CSSProperties,
  notice: { fontSize: 13, color: "var(--text-secondary)", padding: "10px 12px", borderRadius: 7, background: "var(--bg-hover)" } satisfies CSSProperties,
  footer: { fontSize: 11.5, color: "var(--text-muted)", marginTop: 12 } satisfies CSSProperties,
  // tree
  symbolRow: (open: boolean): CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    padding: "5px 6px",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    color: "inherit",
    textAlign: "left",
    background: open ? "var(--bg-hover)" : "transparent",
  }),
  chevron: (open: boolean): CSSProperties => ({
    color: "var(--text-muted)",
    transform: open ? "rotate(90deg)" : "none",
    transition: "transform .12s",
    flexShrink: 0,
  }),
  symbolName: { fontSize: 12.5, fontWeight: 600 } satisfies CSSProperties,
  symbolFile: { fontSize: 11.5, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } satisfies CSSProperties,
  callerCount: { fontSize: 11, color: "var(--text-muted)", marginLeft: "auto", flexShrink: 0 } satisfies CSSProperties,
  branch: { padding: "4px 0 8px 22px" } satisfies CSSProperties,
  callerRow: { display: "flex", alignItems: "center", gap: 7, padding: "3px 0", fontSize: 12.5 } satisfies CSSProperties,
  callerName: { color: "var(--text-muted)", fontSize: 12 } satisfies CSSProperties,
  muted: { fontSize: 12, color: "var(--text-muted)", padding: "3px 0" } satisfies CSSProperties,
  badges: { display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 8 } satisfies CSSProperties,
  // graph
  picker: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8, fontSize: 12, color: "var(--text-muted)" } satisfies CSSProperties,
  graphWrap: { overflowX: "auto" } satisfies CSSProperties,
  legend: { display: "flex", gap: 14, fontSize: 11, color: "var(--text-muted)", marginTop: 8, paddingLeft: 4 } satisfies CSSProperties,
} as const;
