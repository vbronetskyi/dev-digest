/* SkillEditor — right pane of the Skills Lab: header plus Config / Preview /
   Stats / Versions tabs (mirrors the agent editor). With no `skillId` it renders
   the create form. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, EmptyState, Icon, Skeleton, Tabs } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { useSkill } from "@/lib/hooks/skills";
import { SkillConfigForm } from "../SkillConfigForm";
import { SkillPreview } from "../SkillPreview";
import { SkillStats } from "../SkillStats";
import { SkillVersions } from "../SkillVersions";
import { SKILL_TYPE_META } from "@/lib/skills";
import { EDITOR_TABS, UNTRUSTED_SOURCES } from "../../constants";
import { s } from "./styles";

export function SkillEditor({
  skillId,
  tab,
  onTab,
  onCreated,
  onDeleted,
}: {
  skillId: string | null;
  tab: string;
  onTab: (tab: string) => void;
  onCreated: (skill: Skill) => void;
  onDeleted: () => void;
}) {
  const t = useTranslations("skills");
  const { data: skill, isLoading, isError } = useSkill(skillId);

  if (!skillId) {
    return (
      <div style={s.body}>
        <SkillConfigForm onCreated={onCreated} />
      </div>
    );
  }
  if (isLoading) {
    return (
      <div style={{ ...s.body, display: "flex", flexDirection: "column", gap: 16 }}>
        <Skeleton height={24} width={240} />
        <Skeleton height={200} />
      </div>
    );
  }
  if (isError || !skill) {
    return <EmptyState icon="Sparkles" title={t("detail.notFound.title")} body={t("detail.notFound.body")} />;
  }

  const type = SKILL_TYPE_META[skill.type];
  const tabs = EDITOR_TABS.map((tb) => ({ key: tb.key, label: t(`editor.tabs.${tb.key}`), icon: tb.icon }));
  return (
    <>
      <div style={s.head}>
        <span style={s.typeIcon(type.c, type.bg)}>
          <Icon.Sparkles size={15} aria-hidden />
        </span>
        <h1 className="mono" style={s.name}>
          {skill.name}
        </h1>
        <span style={s.chip(type.c, type.bg)}>{t(`listItem.type.${skill.type}`)}</span>
        <Badge color="var(--text-secondary)" icon="GitCommit">
          {t("preview.version", { version: skill.version })}
        </Badge>
        {UNTRUSTED_SOURCES.includes(skill.source) && (
          <Badge color="var(--warn)" bg="var(--warn-bg)">
            {t("preview.untrustedBadge")}
          </Badge>
        )}
        {!skill.enabled && <Badge color="var(--text-muted)">{t("preview.disabled")}</Badge>}
      </div>
      <div style={s.tabs}>
        <Tabs tabs={tabs} value={tab} onChange={onTab} pad="0 24px" />
      </div>
      <div style={s.body}>
        {/* keyed on id+version so a save (new version) resets the form to the stored body */}
        {tab === "config" && <SkillConfigForm key={`${skill.id}:${skill.version}`} skill={skill} onDeleted={onDeleted} />}
        {tab === "preview" && <SkillPreview skill={skill} />}
        {tab === "stats" && <SkillStats skillId={skill.id} />}
        {tab === "versions" && <SkillVersions skill={skill} />}
      </div>
    </>
  );
}

export default SkillEditor;
