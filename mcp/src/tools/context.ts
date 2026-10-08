import type { DevDigestApi } from "../api.js";

export interface ToolContext {
  api: DevDigestApi;
  /** Poll interval while a run is in progress. */
  pollMs: number;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}
