/* hooks/intent.ts — the PR's derived intent (L03). Reading is free; deriving is one model call. */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type { PrIntentRecord } from "@devdigest/shared";

type IntentResponse = { intent: PrIntentRecord | null };

export function usePrIntent(prId: string | null | undefined) {
  return useQuery({
    queryKey: ["pr-intent", prId],
    queryFn: () => api.get<IntentResponse>(`/pulls/${prId}/intent`),
    enabled: !!prId,
  });
}

export function useDeriveIntent(prId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<IntentResponse>(`/pulls/${prId}/intent`, {}),
    onSuccess: (res) => qc.setQueryData(["pr-intent", prId], res),
  });
}
