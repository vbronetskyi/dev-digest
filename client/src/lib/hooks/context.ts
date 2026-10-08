/* hooks/context.ts — Project Context Folder (L05 SPEC-01): the repo's specs/,
   docs/ and insights/ Markdown, and the documents an agent attaches. No model call. */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type { AgentContext, ContextDocBody, ContextDocList } from "@devdigest/shared";

export function useContextDocs(repoId: string | null | undefined) {
  return useQuery({
    queryKey: ["context-docs", repoId],
    queryFn: () => api.get<ContextDocList>(`/repos/${repoId}/context`),
    enabled: !!repoId,
  });
}

export function useContextDoc(repoId: string | null | undefined, path: string | null | undefined) {
  return useQuery({
    queryKey: ["context-doc", repoId, path],
    queryFn: () => api.get<ContextDocBody>(`/repos/${repoId}/context/file?path=${encodeURIComponent(path ?? "")}`),
    enabled: !!repoId && !!path,
  });
}

export function useAgentContext(agentId: string | null | undefined) {
  return useQuery({
    queryKey: ["agent-context", agentId],
    queryFn: () => api.get<AgentContext>(`/agents/${agentId}/context`),
    enabled: !!agentId,
  });
}

/** Saves the whole ordered list; optimistic, like the Skills tab. "Used by" counts refresh after. */
export function useSetAgentContext(agentId: string) {
  const qc = useQueryClient();
  const key = ["agent-context", agentId];
  return useMutation({
    mutationFn: (paths: string[]) => api.put<AgentContext>(`/agents/${agentId}/context`, { paths }),
    onMutate: async (paths) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<AgentContext>(key);
      qc.setQueryData<AgentContext>(key, { paths });
      return { previous };
    },
    onError: (_err, _paths, ctx) => qc.setQueryData(key, ctx?.previous),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["context-docs"] });
    },
  });
}
