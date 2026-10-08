import type { CSSProperties } from "react";

/** Co-located styles for TourSection. */
export const s = {
  card: {
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--bg-elevated)",
    marginBottom: 14,
    overflow: "hidden",
    scrollMarginTop: 16,
  } satisfies CSSProperties,
  head: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "13px 16px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "inherit",
    fontFamily: "inherit",
    textAlign: "left",
  } satisfies CSSProperties,
  icon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    background: "var(--accent-bg)",
    color: "var(--accent)",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  } satisfies CSSProperties,
  title: { fontSize: 14.5, fontWeight: 600, flex: 1 } satisfies CSSProperties,
  body: { padding: "0 18px 16px", fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6 } satisfies CSSProperties,
  diagram: { marginTop: 12, padding: 12, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-primary)" } satisfies CSSProperties,
  links: { listStyle: "none", padding: 0, margin: "12px 0 0", display: "flex", flexDirection: "column", gap: 8 } satisfies CSSProperties,
  link: { display: "flex", gap: 11, alignItems: "flex-start" } satisfies CSSProperties,
  step: {
    width: 20,
    height: 20,
    borderRadius: 99,
    background: "var(--accent-bg)",
    color: "var(--accent)",
    fontSize: 11,
    fontWeight: 700,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    marginTop: 1,
  } satisfies CSSProperties,
  linkText: { display: "flex", flexDirection: "column", minWidth: 0 } satisfies CSSProperties,
  path: { fontSize: 12.5, color: "var(--accent-text)", overflowWrap: "anywhere" } satisfies CSSProperties,
  label: { fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 } satisfies CSSProperties,
} as const;

export function chevronFor(open: boolean): CSSProperties {
  return { color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" };
}
