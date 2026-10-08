import type { CSSProperties } from "react";

/** Layout styles for the Skills Lab page. */
export const s = {
  layout: { display: "flex", height: "calc(100vh - 52px)" } satisfies CSSProperties,
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 } satisfies CSSProperties,
  center: { flex: 1, display: "grid", placeItems: "center", padding: 28 } satisfies CSSProperties,
} as const;
