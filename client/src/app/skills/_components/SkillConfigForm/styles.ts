import type { CSSProperties } from "react";

/** Co-located styles for SkillConfigForm. */
export const s = {
  wrap: { maxWidth: 760 } satisfies CSSProperties,
  titleRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 } satisfies CSSProperties,
  title: { fontSize: 16, fontWeight: 700 } satisfies CSSProperties,
  enabled: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12.5,
    color: "var(--text-secondary)",
  } satisfies CSSProperties,
  notice: {
    display: "flex",
    gap: 10,
    padding: "10px 12px",
    marginBottom: 16,
    borderRadius: 8,
    fontSize: 12.5,
    lineHeight: 1.5,
    color: "var(--text-secondary)",
    border: "1px solid var(--warn)",
    background: "var(--warn-bg)",
  } satisfies CSSProperties,
  tokens: { fontSize: 11, color: "var(--text-muted)" } satisfies CSSProperties,
  actions: { display: "flex", alignItems: "center", gap: 8, marginTop: 8 } satisfies CSSProperties,
  note: { marginLeft: "auto", fontSize: 11.5, color: "var(--text-muted)" } satisfies CSSProperties,
  error: { marginTop: 10, fontSize: 12.5, color: "var(--crit)" } satisfies CSSProperties,
  danger: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 28,
    paddingTop: 18,
    borderTop: "1px solid var(--border)",
  } satisfies CSSProperties,
  dangerTitle: { fontSize: 13, fontWeight: 600, color: "var(--crit)" } satisfies CSSProperties,
  dangerBody: { marginTop: 2, fontSize: 12, color: "var(--text-muted)" } satisfies CSSProperties,
};
