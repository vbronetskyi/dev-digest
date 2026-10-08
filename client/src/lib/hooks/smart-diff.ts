/* hooks/smart-diff.ts — reviewer-ordered files of a PR (HW L03). Rules only, no model call. */
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import type { SmartDiff } from "@devdigest/shared";

/** Keyed under ["reviews", prId] so a finished run or a rejected finding refreshes the markers. */
export function useSmartDiff(prId: string | null | undefined) {
  return useQuery({
    queryKey: ["reviews", prId, "smart-diff"],
    queryFn: () => api.get<SmartDiff>(`/pulls/${prId}/smart-diff`),
    enabled: !!prId,
  });
}
