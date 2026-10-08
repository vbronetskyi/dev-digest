import type { CSSProperties } from "react";

/** Co-located styles for ImportSkillDrawer. */
export const s = {
  body: { padding: 24 } satisfies CSSProperties,
  tabs: { margin: "-24px -24px 20px" } satisfies CSSProperties,
  pickRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 } satisfies CSSProperties,
  picked: { fontSize: 12.5, color: "var(--text-secondary)" } satisfies CSSProperties,
  or: { fontSize: 12, color: "var(--text-muted)", marginBottom: 8 } satisfies CSSProperties,
  footer: { display: "flex", justifyContent: "flex-end", gap: 8 } satisfies CSSProperties,
  error: { fontSize: 12.5, color: "var(--crit)", marginTop: -8, marginBottom: 16 } satisfies CSSProperties,
  warnings: {
    padding: "12px 14px",
    marginBottom: 20,
    borderRadius: 8,
    border: "1px solid var(--warn)",
    background: "var(--warn-bg)",
  } satisfies CSSProperties,
  warningsTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 600,
    color: "var(--warn)",
    marginBottom: 6,
  } satisfies CSSProperties,
  warningList: { margin: 0, paddingLeft: 20, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-secondary)" } satisfies CSSProperties,
  row: { display: "grid", gridTemplateColumns: "1fr 180px", gap: 16 } satisfies CSSProperties,
  source: { fontSize: 12, color: "var(--text-muted)", marginBottom: 16, wordBreak: "break-all" } satisfies CSSProperties,
  pre: {
    margin: 0,
    maxHeight: 320,
    overflow: "auto",
    padding: "12px 14px",
    fontSize: 12,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    borderRadius: 7,
    border: "1px solid var(--border)",
    background: "var(--code-bg)",
  } satisfies CSSProperties,
};
