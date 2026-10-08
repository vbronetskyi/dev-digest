/** Blast radius (HW L04). Everything here reads the repo-intel index; no model call. */

/** Callers shown per changed symbol (the facade caps at the same number). */
export const MAX_CALLERS_SHOWN = 20;

export const DEGRADED_MESSAGES = {
  not_indexed: 'The repository is not indexed yet. Wait for the Indexed badge, then reload.',
  no_files: "DevDigest has no files for this PR yet. Open the PR's Files tab or run a review, then reload.",
  flag_off: 'Repo intelligence is turned off on this server (REPO_INTEL_ENABLED=false).',
} as const;
