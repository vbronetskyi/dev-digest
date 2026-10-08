import type { CSSProperties } from "react";

/** Co-located styles for DocList. */
export const s = {
  wrap: {
    width: 300,
    flexShrink: 0,
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--bg-surface)",
    padding: "10px 8px",
    position: "sticky",
    top: 16,
    maxHeight: "calc(100vh - 140px)",
    overflowY: "auto",
  } satisfies CSSProperties,
  group: { marginBottom: 10 } satisfies CSSProperties,
  groupHead: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    padding: "6px 8px",
  } satisfies CSSProperties,
  dot: { width: 6, height: 6, borderRadius: 2 } satisfies CSSProperties,
  groupCount: { marginLeft: "auto", fontWeight: 600 } satisfies CSSProperties,
  texts: { display: "flex", flexDirection: "column", minWidth: 0, flex: 1, textAlign: "left" } satisfies CSSProperties,
  name: { fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } satisfies CSSProperties,
  dir: { fontSize: 10.5, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } satisfies CSSProperties,
  tokens: { fontSize: 10.5, color: "var(--text-muted)", flexShrink: 0 } satisfies CSSProperties,
} as const;

export function itemFor(active: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    padding: "7px 9px",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit",
    color: active ? "var(--text-primary)" : "var(--text-secondary)",
    background: active ? "var(--bg-hover)" : "transparent",
  };
}
