/* BlastRadiusCard — what this PR can break, read from the repo index (HW L04):
   changed symbols → callers → endpoints / crons. No model call. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, ErrorState, Icon, SectionLabel, Skeleton } from "@devdigest/ui";
import { useBlastRadius } from "@/lib/hooks/blast";
import { ApiError } from "@/lib/api";
import { BlastGraph } from "./BlastGraph";
import { BlastTree } from "./BlastTree";
import { blastStats } from "./helpers";
import { s } from "./styles";

type View = "tree" | "graph";
const STAT_ICONS = { symbols: "Code", callers: "CornerDownRight", endpoints: "Globe", crons: "Clock" } as const;

export function BlastRadiusCard({ prId, repo, defaultBranch }: { prId: string; repo: string; defaultBranch: string }) {
  const t = useTranslations("blast");
  const { data: blast, isLoading, isError, error, refetch } = useBlastRadius(prId);
  const [view, setView] = React.useState<View>("tree");

  return (
    <section>
      <SectionLabel icon="Workflow">{t("title")}</SectionLabel>
      <div style={s.card}>
        {isLoading ? (
          <Skeleton height={90} />
        ) : isError || !blast ? (
          <ErrorState title={t("loadError")} body={error instanceof ApiError ? error.message : undefined} onRetry={() => refetch()} />
        ) : blast.degraded ? (
          <p style={s.notice} role="note">
            {blast.degraded.message}
          </p>
        ) : (
          <>
            <div style={s.head}>
              {(Object.entries(blastStats(blast)) as [keyof typeof STAT_ICONS, number][])
                .filter(([k, n]) => k !== "crons" || n > 0)
                .map(([k, n]) => {
                  const I = Icon[STAT_ICONS[k]];
                  return (
                    <span key={k} style={s.stat}>
                      <I size={13} style={{ color: "var(--text-muted)" }} aria-hidden />
                      <b className="tnum" style={s.statNum}>
                        {n}
                      </b>
                      {t(`stat.${k}`)}
                    </span>
                  );
                })}
              {blast.downstream.length > 0 && (
                <div style={s.views} role="group">
                  {(["tree", "graph"] as const).map((v) => (
                    <Button key={v} kind="tertiary" size="sm" active={view === v} aria-pressed={view === v} onClick={() => setView(v)}>
                      {t(`view.${v}`)}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            {blast.downstream.length === 0 ? (
              <p style={s.summary}>{blast.summary}</p>
            ) : view === "tree" ? (
              <BlastTree blast={blast} repo={repo} sha={blast.indexed_sha ?? defaultBranch} />
            ) : (
              <BlastGraph blast={blast} />
            )}
            <div style={s.footer}>
              {blast.indexed_sha
                ? t("footer", { sha: blast.indexed_sha.slice(0, 7), ms: blast.duration_ms ?? 0 })
                : t("footerNoSha", { ms: blast.duration_ms ?? 0 })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default BlastRadiusCard;
