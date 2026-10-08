/* /repos/:repoId/onboarding — Onboarding Tour (L05 SPEC-02). Opening the page
   reads the stored tour (free); only Generate / Regenerate makes the one model
   call, over facts DevDigest collected with code. */
"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ErrorState, Skeleton } from "@devdigest/ui";
import { AppShell } from "@/components/app-shell";
import { RepoNotFound } from "@/components/repo-not-found";
import { useGenerateOnboarding, useOnboarding } from "@/lib/hooks/onboarding";
import { useActiveRepo, useRepoNotFound } from "@/lib/repo-context";
import { ApiError } from "@/lib/api";
import { OnboardingTour } from "./_components/OnboardingTour";
import { s } from "./styles";

const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : String(err));

export default function OnboardingTourPage() {
  const t = useTranslations("onboarding");
  const { repoId } = useParams<{ repoId: string }>();
  const { activeRepo } = useActiveRepo();
  const repoNotFound = useRepoNotFound(repoId);
  const { data, isLoading, isError, error, refetch } = useOnboarding(repoId);
  const generate = useGenerateOnboarding(repoId);

  const crumb = [{ label: activeRepo?.full_name ?? t("repoFallback"), mono: true }, { label: t("title") }];
  if (repoNotFound) {
    return (
      <AppShell crumb={crumb}>
        <RepoNotFound />
      </AppShell>
    );
  }

  return (
    <AppShell crumb={crumb}>
      <div style={s.page}>
        {isLoading ? (
          <Skeleton height={360} />
        ) : isError ? (
          <ErrorState title={t("loadError.title")} body={messageOf(error)} onRetry={() => refetch()} />
        ) : (
          <OnboardingTour
            tour={data?.onboarding ?? null}
            repoFullName={activeRepo?.full_name ?? null}
            generating={generate.isPending}
            error={generate.isError ? messageOf(generate.error) : null}
            onGenerate={() => generate.mutate()}
          />
        )}
      </div>
    </AppShell>
  );
}
