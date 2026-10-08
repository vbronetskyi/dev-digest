import type { CSSProperties } from "react";

/** Co-located styles for SkillStats. */
export const s = {
  tiles: { display: "flex", gap: 12, marginBottom: 20 } satisfies CSSProperties,
  tile: {
    flex: 1,
    padding: 15,
    borderRadius: 9,
    border: "1px solid var(--border)",
    background: "var(--bg-elevated)",
  } satisfies CSSProperties,
  label: { fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", color: "var(--text-muted)" } satisfies CSSProperties,
  value: { marginTop: 10, fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" } satisfies CSSProperties,
  unit: { fontSize: 15, fontWeight: 500, color: "var(--text-muted)" } satisfies CSSProperties,
  hint: { marginTop: 4, fontSize: 11.5, lineHeight: 1.4, color: "var(--text-muted)" } satisfies CSSProperties,
  agents: { display: "flex", flexDirection: "column", gap: 8 } satisfies CSSProperties,
  agent: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "8px 10px",
    borderRadius: 7,
    border: "1px solid var(--border)",
    background: "var(--bg-elevated)",
  } satisfies CSSProperties,
  agentName: { flex: 1, fontSize: 12.5, fontWeight: 600 } satisfies CSSProperties,
};
