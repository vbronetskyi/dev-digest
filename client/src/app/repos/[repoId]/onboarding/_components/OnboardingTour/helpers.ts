/** 7-character commit, the way git shows it. */
export function shortSha(sha: string | null | undefined): string {
  return sha ? sha.slice(0, 7) : "—";
}

/** "8 Oct 2026, 15:04" — the reader's locale and time zone. */
export function formatGenerated(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
