/* IntentCard — what the PR is for and where it stops (L03 intent layer). The
   reviewers get the same text as an untrusted block. Deriving is one model call
   and only happens on a click or as part of a review. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, Icon, SectionLabel, Skeleton } from "@devdigest/ui";
import { useDeriveIntent, usePrIntent } from "@/lib/hooks/intent";
import { ApiError } from "@/lib/api";
import { formatCost } from "@/lib/format-cost";
import { s } from "./styles";

export function IntentCard({ prId, headSha }: { prId: string; headSha: string | null | undefined }) {
  const t = useTranslations("brief");
  const { data, isLoading, isError } = usePrIntent(prId);
  const derive = useDeriveIntent(prId);
  const intent = data?.intent ?? null;
  const stale = !!intent?.head_sha && !!headSha && intent.head_sha !== headSha;

  const button = (
    <Button kind="secondary" size="sm" icon="Sparkles" loading={derive.isPending} title={t("intent.cost")} onClick={() => derive.mutate()}>
      {derive.isPending ? t("intent.deriving") : intent ? t("intent.rederive") : t("intent.derive")}
    </Button>
  );
  const failure = derive.isError && (
    <p role="alert" style={s.error}>
      {t("intent.failed", { message: derive.error instanceof ApiError ? derive.error.message : String(derive.error) })}
    </p>
  );

  return (
    <section>
      <SectionLabel icon="Target">{t("block.intent")}</SectionLabel>
      <div style={s.card}>
        {isLoading ? (
          <Skeleton height={70} />
        ) : isError ? (
          <p style={s.empty}>{t("intent.loadError")}</p>
        ) : !intent ? (
          <>
            <div style={s.foot}>
              <p style={s.empty}>{t("intent.empty")}</p>
              {button}
            </div>
            {failure}
          </>
        ) : (
          <>
            <p style={s.quote}>“{intent.intent}”</p>
            <div style={s.cols}>
              <Column title={t("intent.inScope")} items={intent.in_scope} color="var(--ok)" icon="Check" none={t("intent.noneStated")} />
              <Column title={t("intent.outOfScope")} items={intent.out_of_scope} color="var(--text-muted)" icon="X" none={t("intent.noneStated")} muted />
            </div>
            {stale && (
              <p style={s.stale} role="note">
                {t("intent.stale")}
              </p>
            )}
            <div style={s.foot}>
              <span style={s.meta}>
                {t("intent.meta", {
                  model: intent.model ?? "—",
                  cost: formatCost(intent.cost_usd),
                  sha: (intent.head_sha ?? "").slice(0, 7) || "—",
                })}
              </span>
              {button}
            </div>
            {failure}
          </>
        )}
      </div>
    </section>
  );
}

function Column({
  title,
  items,
  color,
  icon,
  none,
  muted = false,
}: {
  title: string;
  items: string[];
  color: string;
  icon: "Check" | "X";
  none: string;
  muted?: boolean;
}) {
  const I = Icon[icon];
  return (
    <div>
      <div style={s.colHead(color)}>
        <I size={13} aria-hidden />
        {title}
      </div>
      {items.length === 0 ? (
        <span style={s.none}>{none}</span>
      ) : (
        <ul style={s.list}>
          {items.map((it) => (
            <li key={it} style={s.item(muted)}>
              <span aria-hidden>·</span>
              {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default IntentCard;
