/* /repos/:repoId/context — Project Context Folder (L05 SPEC-01): the repo's
   specs/, docs/ and insights/ Markdown as committed on the default branch.
   Read-only: the repository is the source of truth. Agents attach documents in
   their Context tab; reviews read them as untrusted context. No model call. */
"use client";

import React from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { EmptyState, ErrorState, Skeleton } from "@devdigest/ui";
import { AppShell } from "@/components/app-shell";
import { RepoNotFound } from "@/components/repo-not-found";
import { useContextDocs } from "@/lib/hooks/context";
import { useActiveRepo, useRepoNotFound } from "@/lib/repo-context";
import { ApiError } from "@/lib/api";
import { DocList } from "./_components/DocList";
import { DocPanel } from "./_components/DocPanel";
import { s } from "./styles";

export default function ProjectContextPage() {
  const t = useTranslations("context");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { repoId } = useParams<{ repoId: string }>();
  const { activeRepo } = useActiveRepo();
  const repoNotFound = useRepoNotFound(repoId);
  const { data, isLoading, isError, error, refetch } = useContextDocs(repoId);

  const crumb = [{ label: activeRepo?.full_name ?? t("page.repoFallback"), mono: true }, { label: t("page.crumb") }];
  if (repoNotFound) {
    return (
      <AppShell crumb={crumb}>
        <RepoNotFound />
      </AppShell>
    );
  }

  const branch = activeRepo?.default_branch ?? "main";
  const docs = data?.docs ?? [];
  const selected = docs.find((d) => d.path === params.get("doc")) ?? docs[0] ?? null;
  const select = (path: string) => router.replace(`${pathname}?doc=${encodeURIComponent(path)}`, { scroll: false });

  return (
    <AppShell crumb={crumb}>
      <div style={s.page}>
        <h1 style={s.h1}>
          {t("page.heading")}
          <span className="mono" style={s.repo}>
            {activeRepo?.full_name ?? t("page.repoFallback")}
          </span>
        </h1>
        {data && docs.length > 0 && <p style={s.subtitle}>{t("page.subtitle", { count: docs.length, branch })}</p>}

        {isLoading ? (
          <Skeleton height={320} />
        ) : isError || !data ? (
          <ErrorState title={t("page.loadError")} body={error instanceof ApiError ? error.message : undefined} onRetry={() => refetch()} />
        ) : data.reason === "no_clone" ? (
          <EmptyState icon="Folder" title={t("page.noClone.title")} body={t("page.noClone.body")} />
        ) : docs.length === 0 || !selected ? (
          <EmptyState icon="Folder" title={t("page.empty.title")} body={t("page.empty.body", { branch })} />
        ) : (
          <div style={s.split}>
            <DocList docs={docs} selected={selected.path} onSelect={select} />
            <DocPanel repoId={repoId} repoFullName={activeRepo?.full_name ?? null} branch={branch} doc={selected} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
