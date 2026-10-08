/* SkillStats — who links the skill and how many review runs actually carried it. */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, EmptyState, Icon, MonoLink, SectionLabel, Skeleton } from "@devdigest/ui";
import { useSkillStats } from "@/lib/hooks/skills";
import { s } from "./styles";

export function SkillStats({ skillId }: { skillId: string }) {
  const t = useTranslations("skills");
  const router = useRouter();
  const { data: stats, isLoading } = useSkillStats(skillId);
  if (isLoading || !stats) return <Skeleton height={120} />;
  if (stats.linked_agents.length === 0 && stats.runs_used === 0) {
    return <EmptyState icon="BarChart" title={t("stats.emptyTitle")} body={t("stats.emptyBody")} />;
  }
  const agents = stats.linked_agents.length;
  return (
    <div>
      <div style={s.tiles}>
        <div style={s.tile}>
          <div style={s.label}>{t("stats.usedBy")}</div>
          <div className="tnum" style={s.value}>
            {agents} <span style={s.unit}>{t("stats.agentsUnit", { count: agents })}</span>
          </div>
        </div>
        <div style={s.tile}>
          <div style={s.label}>{t("stats.runs")}</div>
          <div className="tnum" style={s.value}>
            {stats.runs_used}
          </div>
          <div style={s.hint}>{t("stats.runsHint")}</div>
        </div>
        <div style={s.tile}>
          <div style={s.label}>{t("stats.lastUsed")}</div>
          <div style={{ ...s.value, fontSize: 16 }}>
            {stats.last_used_at ? new Date(stats.last_used_at).toLocaleString() : t("stats.never")}
          </div>
        </div>
      </div>
      {agents > 0 && (
        <Card>
          <SectionLabel icon="Cpu">{t("stats.agentsTitle")}</SectionLabel>
          <div style={s.agents}>
            {stats.linked_agents.map((a) => (
              <div key={a.id} style={s.agent}>
                <Icon.Cpu size={13} style={{ color: "var(--accent)" }} aria-hidden />
                <span style={s.agentName}>{a.name}</span>
                <MonoLink onClick={() => router.push(`/agents/${a.id}?tab=skills`)}>{t("stats.open")}</MonoLink>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default SkillStats;
