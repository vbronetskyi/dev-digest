import type { CSSProperties } from "react";

/** Co-located styles for SkillEditor (the right pane). */
export const s = {
  head: { display: "flex", alignItems: "center", gap: 10, padding: "16px 24px 0", flexShrink: 0 } satisfies CSSProperties,
  typeIcon: (c: string, bg: string): CSSProperties => ({
    width: 26,
    height: 26,
    borderRadius: 7,
    display: "grid",
    placeItems: "center",
    color: c,
    background: bg,
  }),
  name: { fontSize: 17, fontWeight: 700 } satisfies CSSProperties,
  chip: (c: string, bg: string): CSSProperties => ({
    fontSize: 10.5,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 5,
    color: c,
    background: bg,
  }),
  tabs: { marginTop: 12, flexShrink: 0 } satisfies CSSProperties,
  body: { flex: 1, overflow: "auto", padding: 24 } satisfies CSSProperties,
};
