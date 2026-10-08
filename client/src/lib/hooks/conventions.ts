/* hooks/conventions.ts — React Query hooks for the conventions extractor (L02). */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type {
  ConventionAcceptRequest,
  ConventionAcceptResult,
  ConventionCandidate,
  ConventionExtraction,
} from "@devdigest/shared";

const key = (repoId: string | null | undefined) => ["conventions", repoId];

export function useConventions(repoId: string | null | undefined) {
  return useQuery({
    queryKey: key(repoId),
    queryFn: () => api.get<ConventionCandidate[]>(`/repos/${repoId}/conventions`),
    enabled: !!repoId,
  });
}

/** One extraction pass — two paid model calls on the server. Never triggered implicitly. */
export function useExtractConventions(repoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ConventionExtraction>(`/repos/${repoId}/conventions/extract`, {}),
    onSuccess: (res) => qc.setQueryData(key(repoId), res.candidates),
  });
}

export function useAcceptConvention(repoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...overrides }: { id: string } & ConventionAcceptRequest) =>
      api.post<ConventionAcceptResult>(`/conventions/${id}/accept`, overrides),
    onSuccess: (res) => {
      qc.setQueryData<ConventionCandidate[]>(key(repoId), (list) =>
        list?.map((c) => (c.id === res.convention.id ? res.convention : c)),
      );
      qc.invalidateQueries({ queryKey: ["skills"] });
    },
  });
}

export function useRejectConvention(repoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: true }>(`/conventions/${id}`),
    onSuccess: (_res, id) =>
      qc.setQueryData<ConventionCandidate[]>(key(repoId), (list) => list?.filter((c) => c.id !== id)),
  });
}
