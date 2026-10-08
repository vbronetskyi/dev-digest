import type { CSSProperties } from "react";

/** Co-located styles for SkillVersions. */
export const s = {
  wrap: { maxWidth: 760 } satisfies CSSProperties,
  head: { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 } satisfies CSSProperties,
  title: { fontSize: 16, fontWeight: 700 } satisfies CSSProperties,
  subtitle: { fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16 } satisfies CSSProperties,
  list: { display: "flex", flexDirection: "column", gap: 8 } satisfies CSSProperties,
  row: (current: boolean): CSSProperties => ({
    borderRadius: 8,
    border: `1px solid ${current ? "var(--border-strong)" : "var(--border)"}`,
    background: current ? "var(--bg-hover)" : "var(--bg-elevated)",
  }),
  rowHead: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" } satisfies CSSProperties,
  chip: (current: boolean): CSSProperties => ({
    fontSize: 12.5,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 5,
    color: current ? "var(--accent-text)" : "var(--text-secondary)",
    background: current ? "var(--accent-bg)" : "var(--bg-hover)",
  }),
  date: { flex: 1, fontSize: 12, color: "var(--text-muted)" } satisfies CSSProperties,
  actions: { display: "flex", gap: 6 } satisfies CSSProperties,
  pre: {
    margin: 0,
    padding: "12px 14px",
    fontSize: 12,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    borderTop: "1px solid var(--border)",
    background: "var(--code-bg)",
  } satisfies CSSProperties,
  diffLine: (kind: "same" | "add" | "del"): CSSProperties => ({
    display: "block",
    padding: "0 14px",
    color: kind === "add" ? "var(--code-add-text)" : kind === "del" ? "var(--code-del-text)" : "var(--text-secondary)",
    background: kind === "add" ? "var(--code-add)" : kind === "del" ? "var(--code-del)" : "transparent",
  }),
};
