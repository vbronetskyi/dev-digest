/* hooks/onboarding.ts — Onboarding Tour (L05 SPEC-02). Reading is free; only
   generate makes the one model call. */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type { Onboarding } from "@devdigest/shared";

const key = (repoId: string | null | undefined) => ["onboarding", repoId];

export function useOnboarding(repoId: string | null | undefined) {
  return useQuery({
    queryKey: key(repoId),
    queryFn: () => api.get<{ onboarding: Onboarding | null }>(`/repos/${repoId}/onboarding`),
    enabled: !!repoId,
  });
}

/** Never triggered implicitly: one model call on the server (or a facts-only skeleton). */
export function useGenerateOnboarding(repoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ onboarding: Onboarding }>(`/repos/${repoId}/onboarding`, {}),
    onSuccess: (res) => qc.setQueryData(key(repoId), res),
  });
}
