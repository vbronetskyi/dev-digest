/* DiffTab — the PR's changed files. Smart order (HW L03) groups them core →
   wiring → boilerplate with the latest findings pinned to their lines and a
   split nudge for oversized PRs; Original order is the list as GitHub gives it. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { SectionLabel, Button, Skeleton } from "@devdigest/ui";
import { DiffViewer, type DiffCommentApi } from "@/components/diff-viewer";
import { usePrComments, useCreatePrComment } from "@/lib/hooks/reviews";
import { useSmartDiff } from "@/lib/hooks/smart-diff";
import { notify } from "@/lib/toast";
import type { PrFile } from "@devdigest/shared";
import { ORDERS, type DiffOrder } from "./constants";
import { annotationsFor, roleSections } from "./helpers";
import { RoleGroup } from "./_components/RoleGroup";
import { SplitBanner } from "./_components/SplitBanner";
import { s } from "./styles";

interface DiffTabProps {
  prId: string | null;
  filesCount: number;
  files: PrFile[];
  /** Inline commenting is offered only on open PRs (GitHub rejects otherwise). */
  canComment?: boolean;
}

export function DiffTab({ prId, filesCount, files, canComment }: DiffTabProps) {
  const t = useTranslations("prReview");
  const { data: comments } = usePrComments(prId);
  const create = useCreatePrComment(prId);
  const smart = useSmartDiff(prId);
  // Comments start hidden so the diff is clean by default — toggle to reveal.
  const [showComments, setShowComments] = React.useState(false);
  const [order, setOrder] = React.useState<DiffOrder>("smart");

  const commentCount = comments?.length ?? 0;

  const commenting: DiffCommentApi = {
    comments: comments ?? [],
    canComment: !!canComment && !!prId,
    showComments,
    posting: create.isPending,
    onSubmit: async (input) => {
      try {
        const res = await create.mutateAsync(input);
        setShowComments(true); // a just-posted comment shouldn't stay hidden
        return res;
      } catch (err) {
        notify.error(err instanceof Error ? err.message : t("smartDiff.commentError"));
        throw err;
      }
    },
  };

  const data = smart.data;
  const smartReady = !!data && data.groups.length > 0;
  const shown: DiffOrder = smartReady ? order : "original";
  const annotations = React.useMemo(
    () => annotationsFor(data, shown, (reason) => t(`smartDiff.reason.${reason}`)),
    [data, shown, t],
  );

  return (
    <section>
      <SectionLabel
        icon="Code"
        right={
          commentCount > 0 ? (
            <Button
              kind="ghost"
              size="sm"
              icon={showComments ? "EyeOff" : "Eye"}
              onClick={() => setShowComments((v) => !v)}
            >
              {t(showComments ? "smartDiff.hideComments" : "smartDiff.showComments", { count: commentCount })}
            </Button>
          ) : undefined
        }
      >
        {t("smartDiff.title", { count: filesCount })}
      </SectionLabel>

      <div style={s.toolbar}>
        {smartReady && (
          <div style={s.orders} role="group">
            {ORDERS.map((o) => (
              <Button key={o} kind="tertiary" size="sm" active={order === o} aria-pressed={order === o} onClick={() => setOrder(o)}>
                {t(`smartDiff.order.${o}`)}
              </Button>
            ))}
          </div>
        )}
        {smart.isError ? (
          <span style={s.meta}>{t("smartDiff.unavailable")}</span>
        ) : data?.markers_stale ? (
          <span style={{ ...s.meta, ...s.metaStale }} role="status">
            {t("smartDiff.markersStale")}
          </span>
        ) : data?.reviews_used != null ? (
          <span style={s.meta}>{t("smartDiff.markers", { count: data.reviews_used })}</span>
        ) : null}
      </div>

      {smart.isLoading ? (
        <Skeleton height={120} />
      ) : (
        <>
          {data && <SplitBanner split={data.split_suggestion} />}
          {shown === "smart" && data ? (
            roleSections(data, files).map((sec) => (
              <RoleGroup key={sec.role} role={sec.role} files={sec.files} annotations={annotations} commenting={commenting} />
            ))
          ) : (
            <DiffViewer files={files} commenting={commenting} annotations={annotations} />
          )}
        </>
      )}
    </section>
  );
}
