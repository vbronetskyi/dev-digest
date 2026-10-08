/* OnboardingTour — empty state with Generate, or the tour: an "on this page"
   index, five sections, and a footer saying who wrote it and from which index
   commit (or that it is a facts-only skeleton and why). */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, EmptyState } from "@devdigest/ui";
import type { Onboarding } from "@devdigest/shared";
import { formatCost } from "@/lib/format-cost";
import { TourSection } from "../TourSection";
import { formatGenerated, shortSha } from "./helpers";
import { s } from "./styles";

interface OnboardingTourProps {
  tour: Onboarding | null;
  repoFullName: string | null;
  generating: boolean;
  error: string | null;
  onGenerate: () => void;
}

export function OnboardingTour({ tour, repoFullName, generating, error, onGenerate }: OnboardingTourProps) {
  const t = useTranslations("onboarding");
  const alert = error && (
    <div role="alert" style={s.error}>
      {t("generateError", { message: error })}
    </div>
  );

  if (!tour) {
    return (
      <>
        {alert}
        <EmptyState
          icon="Boxes"
          title={t("generate.title")}
          body={t("generate.body")}
          cta={generating ? t("generate.generating") : t("generate.cta")}
          onCta={onGenerate}
          ctaLoading={generating}
        />
      </>
    );
  }

  const meta = tour.meta;
  const sha = meta?.indexed_sha ?? null;
  const footer = !meta
    ? null
    : meta.source === "skeleton"
      ? t("meta.skeleton", { reason: meta.reason ?? "—", sha: shortSha(sha), date: formatGenerated(meta.generated_at) })
      : t("meta.model", { model: meta.model ?? "—", cost: formatCost(meta.cost_usd), sha: shortSha(sha), date: formatGenerated(meta.generated_at) });

  return (
    <div style={s.layout}>
      <nav style={s.nav} aria-label={t("onThisPage")}>
        <div style={s.navHead}>{t("onThisPage")}</div>
        {tour.sections.map((sec) => (
          <a key={sec.kind} href={`#${sec.kind}`} style={s.navLink}>
            {sec.title}
          </a>
        ))}
      </nav>
      <div style={s.main}>
        <div style={s.head}>
          <h1 style={s.h1}>
            {t("heading")}
            <span className="mono" style={s.repo}>
              {repoFullName ?? t("repoFallback")}
            </span>
          </h1>
          <Button kind="ghost" size="sm" icon="RefreshCw" loading={generating} onClick={onGenerate}>
            {generating ? t("regenerating") : t("regenerate")}
          </Button>
        </div>
        {alert}
        {tour.sections.map((sec) => (
          <TourSection key={sec.kind} section={sec} repoFullName={repoFullName} sha={sha} />
        ))}
        {footer && (
          <p style={s.footer(meta?.source === "skeleton")} data-testid="tour-footer">
            {footer}
          </p>
        )}
      </div>
    </div>
  );
}
