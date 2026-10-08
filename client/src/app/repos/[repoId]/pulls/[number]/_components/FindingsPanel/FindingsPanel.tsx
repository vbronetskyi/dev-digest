/* FindingsPanel — severity summary + severity filter, hide-low-confidence,
   j/k navigation and the FindingCard list, wiring the accept/dismiss action
   hook (A2). Counts are taken from the same list the cards render from, so a
   pill always equals the number of its cards below. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Toggle, EmptyState, Button, SEV } from "@devdigest/ui";
import type { FindingRecord, Severity } from "@devdigest/shared";
import { SeverityPill } from "@/components/severity";
import { SEVERITIES, countBySeverity, presentSeverities } from "@/lib/findings";
import { FindingCard } from "../FindingCard";
import { useFindingAction } from "../../../../../../../lib/hooks/reviews";
import { KEY_TO_ACTION } from "./constants";
import { filterBySeverity, visibleFindings } from "./helpers";
import { s } from "./styles";

export function FindingsPanel({
  findings,
  prId,
  repoFullName,
  headSha,
}: {
  findings: FindingRecord[];
  prId: string;
  repoFullName?: string | null;
  headSha?: string | null;
}) {
  const t = useTranslations("prReview");
  const action = useFindingAction();
  const [hideLow, setHideLow] = React.useState(false);
  const [severity, setSeverity] = React.useState<Severity | null>(null);
  const [focusIdx, setFocusIdx] = React.useState(0);

  const base = React.useMemo(() => visibleFindings(findings, hideLow), [findings, hideLow]);
  const counts = React.useMemo(() => countBySeverity(base), [base]);
  const present = presentSeverities(counts);
  const shown = React.useMemo(() => filterBySeverity(base, severity), [base, severity]);

  const toggleSeverity = (sev: Severity) => {
    setSeverity((current) => (current === sev ? null : sev));
    setFocusIdx(0);
  };

  // j/k navigation + a/d shortcuts on the focused finding (keyboard).
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "j") setFocusIdx((i) => Math.min(i + 1, shown.length - 1));
      else if (e.key === "k") setFocusIdx((i) => Math.max(i - 1, 0));
      else if (KEY_TO_ACTION[e.key] && shown[focusIdx]) {
        action.mutate({ findingId: shown[focusIdx]!.id, action: KEY_TO_ACTION[e.key]!, prId });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shown, focusIdx, action, prId]);

  return (
    <div>
      {present.length > 0 && (
        <div style={s.summary} role="group" aria-label={t("panel.severitySummary")}>
          {present.map((sev, i) => (
            <React.Fragment key={sev}>
              {i > 0 && (
                <span style={s.summaryDot} aria-hidden>
                  ·
                </span>
              )}
              <SeverityPill severity={sev} count={counts[sev]} label={t(`panel.severity.${sev}`)} />
            </React.Fragment>
          ))}
        </div>
      )}

      <div style={s.toolbar}>
        {findings.length > 0 && (
          <div style={s.filterGroup} role="group" aria-label={t("panel.filterBySeverity")}>
            {SEVERITIES.map((sev) => {
              const active = severity === sev;
              return (
                <Button
                  key={sev}
                  kind={active ? "secondary" : "ghost"}
                  size="sm"
                  icon={SEV[sev].icon}
                  active={active}
                  aria-pressed={active}
                  // An active filter stays clickable even if its level emptied,
                  // otherwise it could never be switched off.
                  disabled={!active && counts[sev] === 0}
                  onClick={() => toggleSeverity(sev)}
                  style={active ? s.activeFilter(SEV[sev].c, SEV[sev].bg) : undefined}
                >
                  {t(`panel.severity.${sev}`)}
                </Button>
              );
            })}
          </div>
        )}
        <div style={s.toggleGroup}>
          {t("panel.hideLowConfidence")}
          <Toggle on={hideLow} onChange={setHideLow} size={16} />
        </div>
      </div>

      <div style={s.list}>
        {shown.length === 0 ? (
          <EmptyState icon="Filter" title={t("panel.noMatchTitle")} body={t("panel.noMatchBody")} />
        ) : (
          shown.map((f, i) => (
            <FindingCard
              key={f.id}
              f={f}
              focused={i === focusIdx}
              defaultExpanded={i === 0}
              pending={action.isPending}
              repoFullName={repoFullName}
              headSha={headSha}
              onAction={(act) => action.mutate({ findingId: f.id, action: act, prId })}
            />
          ))
        )}
      </div>
    </div>
  );
}
