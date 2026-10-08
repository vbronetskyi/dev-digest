import type { CSSProperties } from "react";

/** Co-located styles for the Project Context page. */
export const s = {
  page: { padding: "24px 28px 40px", maxWidth: 1180, margin: "0 auto" } satisfies CSSProperties,
  h1: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" } satisfies CSSProperties,
  repo: { color: "var(--accent-text)" } satisfies CSSProperties,
  subtitle: { fontSize: 12.5, color: "var(--text-muted)", margin: "6px 0 18px" } satisfies CSSProperties,
  split: { display: "flex", gap: 20, alignItems: "flex-start", marginTop: 4 } satisfies CSSProperties,
} as const;
