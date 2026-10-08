import type { CSSProperties } from "react";

/** Co-located styles for SkillList (the left pane). */
export const s = {
  pane: {
    width: 290,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid var(--border)",
    background: "var(--bg-surface)",
  } satisfies CSSProperties,
  header: { padding: "16px 14px 10px" } satisfies CSSProperties,
  titleRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 } satisfies CSSProperties,
  title: { flex: 1, fontSize: 18, fontWeight: 700 } satisfies CSSProperties,
  list: { flex: 1, overflow: "auto", padding: "0 10px 10px" } satisfies CSSProperties,
  skeletons: { display: "flex", flexDirection: "column", gap: 8, padding: "0 10px" } satisfies CSSProperties,
};
