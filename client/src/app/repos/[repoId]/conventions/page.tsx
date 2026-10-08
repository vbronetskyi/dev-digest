/* /repos/:repoId/conventions — Conventions extractor (L02). Scans the cloned repo
   for house rules backed by quoted evidence; each can become a Skill. A scan is
   two paid model calls, so it only runs on an explicit click. */
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, EmptyState, ErrorState, Skeleton } from "@devdigest/ui";
import type { ConventionAcceptRequest, ConventionExtraction } from "@devdigest/shared";
import { AppShell } from "@/components/app-shell";
import { RepoNotFound } from "@/components/repo-not-found";
import { useAcceptConvention, useConventions, useExtractConventions, useRejectConvention } from "@/lib/hooks";
import { useActiveRepo, useRepoNotFound } from "@/lib/repo-context";
import { ApiError } from "@/lib/api";
import { formatCost } from "@/lib/format-cost";
import { notify } from "@/lib/toast";
import { ConventionCard } from "./_components/ConventionCard";
import { s } from "./styles";

const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : String(err));

export default function ConventionsPage() {
  const t = useTranslations("conventions");
  const router = useRouter();
  const { repoId } = useParams<{ repoId: string }>();
  const { activeRepo } = useActiveRepo();
  const repoNotFound = useRepoNotFound(repoId);
  const { data: list, isLoading, isError, error, refetch } = useConventions(repoId);
  const extract = useExtractConventions(repoId);
  const accept = useAcceptConvention(repoId);
  const reject = useRejectConvention(repoId);
  const [busy, setBusy] = React.useState<ReadonlySet<string>>(new Set());
  const [skillIds, setSkillIds] = React.useState<Record<string, string>>({});
  const [lastScan, setLastScan] = React.useState<ConventionExtraction | null>(null);

  const crumb = [{ label: t("page.crumbLab") }, { label: t("page.crumbConventions") }];
  if (repoNotFound) {
    return (
      <AppShell crumb={crumb}>
        <RepoNotFound />
      </AppShell>
    );
  }

  const candidates = list ?? [];
  const pending = candidates.filter((c) => !c.accepted);
  const mark = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const acceptOne = async (id: string, overrides: ConventionAcceptRequest = {}) => {
    mark(id, true);
    try {
      const res = await accept.mutateAsync({ id, ...overrides });
      setSkillIds((m) => ({ ...m, [id]: res.skill_id }));
      notify.success(t("page.accepted", { name: res.skill_name }));
    } catch (err) {
      notify.error(messageOf(err));
    } finally {
      mark(id, false);
    }
  };
  const rejectOne = async (id: string) => {
    mark(id, true);
    try {
      await reject.mutateAsync(id);
    } catch (err) {
      notify.error(messageOf(err));
    } finally {
      mark(id, false);
    }
  };
  // Sequential on purpose: each accept takes a row lock and may pick a suffixed name.
  const acceptAll = async () => {
    for (const c of pending) await acceptOne(c.id);
  };
  const rejectAll = async () => {
    if (!window.confirm(t("page.rejectAllConfirm", { count: pending.length }))) return;
    for (const c of pending) await rejectOne(c.id);
  };
  const scan = () => extract.mutate(undefined, { onSuccess: setLastScan });

  const subtitle = lastScan
    ? t("page.scanSummary", {
        files: lastScan.sampled_files.length,
        model: lastScan.model,
        dropped: lastScan.dropped,
        cost: formatCost(lastScan.cost_usd),
      })
    : candidates.length > 0
      ? t("page.candidateCount", { count: candidates.length })
      : t("page.subtitle");

  return (
    <AppShell crumb={crumb}>
      <div style={s.page}>
        <div style={s.head}>
          <div style={{ flex: 1 }}>
            <h1 style={s.h1}>
              {t("page.headingPrefix")}
              <span className="mono" style={s.repo}>
                {activeRepo?.full_name ?? t("page.repoFallback")}
              </span>
            </h1>
            <p style={s.subtitle}>{subtitle}</p>
          </div>
          <span title={t("page.costHint")}>
            <Button kind="secondary" size="sm" icon="RefreshCw" loading={extract.isPending} onClick={scan}>
              {extract.isPending ? t("page.scanning") : candidates.length ? t("page.rescan") : t("page.runExtraction")}
            </Button>
          </span>
        </div>

        {extract.isError && (
          <div role="alert" style={s.error}>
            {t("page.extractionFailed")}: {messageOf(extract.error)}
          </div>
        )}

        {pending.length > 1 && (
          <div style={s.bulk}>
            <Button kind="ghost" size="sm" icon="Check" disabled={busy.size > 0} onClick={acceptAll}>
              {t("page.acceptAll", { count: pending.length })}
            </Button>
            <Button kind="ghost" size="sm" icon="X" disabled={busy.size > 0} onClick={rejectAll}>
              {t("page.rejectAll")}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div style={s.skeletons}>
            <Skeleton height={150} />
            <Skeleton height={150} />
          </div>
        ) : isError ? (
          <ErrorState title={t("page.loadError")} body={messageOf(error)} onRetry={() => refetch()} />
        ) : candidates.length === 0 ? (
          <EmptyState
            icon="ListChecks"
            title={t("page.empty.title")}
            body={t("page.empty.body")}
            cta={t("page.empty.cta")}
            onCta={scan}
            ctaLoading={extract.isPending}
          />
        ) : (
          candidates.map((c) => (
            <ConventionCard
              key={c.id}
              candidate={c}
              repoFullName={activeRepo?.full_name ?? ""}
              branch={activeRepo?.default_branch ?? "main"}
              busy={busy.has(c.id)}
              {...(skillIds[c.id] ? { skillId: skillIds[c.id] } : {})}
              onAccept={(overrides) => acceptOne(c.id, overrides)}
              onReject={() => rejectOne(c.id)}
              onOpenSkill={(id) => router.push(`/skills?skill=${id}`)}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}
