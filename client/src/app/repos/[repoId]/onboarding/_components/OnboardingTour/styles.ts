import type { CSSProperties } from "react";

/** Co-located styles for OnboardingTour. */
export const s = {
  layout: { display: "flex", gap: 28, alignItems: "flex-start" } satisfies CSSProperties,
  nav: { width: 180, flexShrink: 0, position: "sticky", top: 16, display: "flex", flexDirection: "column" } satisfies CSSProperties,
  navHead: {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    marginBottom: 10,
  } satisfies CSSProperties,
  navLink: {
    fontSize: 12.5,
    color: "var(--text-secondary)",
    padding: "5px 0 5px 11px",
    borderLeft: "2px solid var(--border)",
    textDecoration: "none",
  } satisfies CSSProperties,
  main: { flex: 1, minWidth: 0 } satisfies CSSProperties,
  head: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 } satisfies CSSProperties,
  h1: { flex: 1, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" } satisfies CSSProperties,
  repo: { color: "var(--accent-text)" } satisfies CSSProperties,
  error: {
    fontSize: 12.5,
    color: "var(--crit)",
    background: "var(--crit-bg)",
    borderRadius: 7,
    padding: "9px 12px",
    marginBottom: 14,
  } satisfies CSSProperties,
  footer: (skeleton: boolean): CSSProperties => ({
    fontSize: 12,
    color: skeleton ? "var(--warn)" : "var(--text-muted)",
    marginTop: 6,
  }),
} as const;
