import type { CSSProperties } from "react";

/** Co-located styles for the shared context-document pieces. */
export const s = {
  body: { fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6, overflowWrap: "anywhere" } satisfies CSSProperties,
} as const;

export function chipFor(color: string, bg: string): CSSProperties {
  return { fontSize: 10.5, fontWeight: 600, color, background: bg, padding: "1px 7px", borderRadius: 4, flexShrink: 0 };
}
