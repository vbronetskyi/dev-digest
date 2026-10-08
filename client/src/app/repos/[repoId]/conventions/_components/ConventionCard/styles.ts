import type { CSSProperties } from "react";

/** Co-located styles for ConventionCard. */
export const s = {
  card: (accepted: boolean): CSSProperties => ({
    border: `1px solid ${accepted ? "var(--ok)" : "var(--border)"}`,
    borderRadius: 9,
    background: "var(--bg-elevated)",
    padding: 16,
    marginBottom: 12,
  }),
  row: { display: "flex", gap: 14 } satisfies CSSProperties,
  main: { flex: 1, minWidth: 0 } satisfies CSSProperties,
  rule: { fontSize: 14, fontWeight: 600, fontStyle: "italic", lineHeight: 1.4 } satisfies CSSProperties,
  code: {
    fontStyle: "normal",
    fontSize: 12.5,
    padding: "1px 5px",
    borderRadius: 4,
    background: "var(--bg-hover)",
    color: "var(--accent-text)",
  } satisfies CSSProperties,
  evidence: { marginTop: 10, borderRadius: 7, border: "1px solid var(--border)", overflow: "hidden" } satisfies CSSProperties,
  evidenceHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "3px 6px 3px 10px",
    background: "var(--bg-surface)",
    borderBottom: "1px solid var(--border)",
  } satisfies CSSProperties,
  pre: {
    margin: 0,
    padding: "10px 12px",
    fontSize: 11.5,
    lineHeight: 1.55,
    color: "var(--text-primary)",
    background: "var(--code-bg)",
    overflow: "auto",
  } satisfies CSSProperties,
  confidence: { display: "flex", alignItems: "center", gap: 10, marginTop: 10 } satisfies CSSProperties,
  confidenceLabel: { fontSize: 11, color: "var(--text-muted)" } satisfies CSSProperties,
  bar: { width: 90 } satisfies CSSProperties,
  pct: { fontSize: 11, color: "var(--text-secondary)" } satisfies CSSProperties,
  actions: { display: "flex", flexDirection: "column", gap: 7, flexShrink: 0, width: 150 } satisfies CSSProperties,
  accepted: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, width: 150, flexShrink: 0 } satisfies CSSProperties,
  edit: { marginTop: 4 } satisfies CSSProperties,
  editActions: { display: "flex", gap: 8 } satisfies CSSProperties,
} as const;
