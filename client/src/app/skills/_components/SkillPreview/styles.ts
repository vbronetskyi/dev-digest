import type { CSSProperties } from "react";

/** Co-located styles for SkillPreview. */
export const s = {
  wrap: { maxWidth: 760 } satisfies CSSProperties,
  head: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 } satisfies CSSProperties,
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 } satisfies CSSProperties,
  subtitle: { fontSize: 12.5, lineHeight: 1.5, color: "var(--text-muted)" } satisfies CSSProperties,
  switcher: { display: "flex", gap: 4, flexShrink: 0 } satisfies CSSProperties,
  raw: {
    margin: 0,
    padding: "14px 16px",
    fontSize: 12,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--code-bg)",
    color: "var(--text-primary)",
  } satisfies CSSProperties,
};
