/* hooks/blast.ts — blast radius of a PR (HW L04). Read-only, no model call. */
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import type { BlastRadius } from "@devdigest/shared";

export function useBlastRadius(prId: string | null | undefined) {
  return useQuery({
    queryKey: ["blast", prId],
    queryFn: () => api.get<BlastRadius>(`/pulls/${prId}/blast-radius`),
    enabled: !!prId,
  });
}
