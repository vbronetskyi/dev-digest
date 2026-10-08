/* SkillCard — one skill in the Skills Lab list: type, name, enabled toggle,
   source, and how many agents link it. Third-party skills nobody enabled yet
   carry a "needs vetting" badge. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Icon, Toggle } from "@devdigest/ui";
import type { SkillListItem } from "@devdigest/shared";
import { SKILL_TYPE_META } from "@/lib/skills";
import { SKILL_SOURCE_ICON } from "../../constants";
import { needsVetting } from "../../helpers";
import { s } from "./styles";

export function SkillCard({
  skill,
  active,
  onSelect,
  onToggle,
}: {
  skill: SkillListItem;
  active: boolean;
  onSelect: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const t = useTranslations("skills");
  const type = SKILL_TYPE_META[skill.type];
  const SourceIcon = Icon[SKILL_SOURCE_ICON[skill.source]];
  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={active ? "true" : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      style={s.card(active, skill.enabled)}
    >
      <div style={s.head}>
        <span style={s.typeIcon(type.c, type.bg)}>
          <Icon.Sparkles size={14} aria-hidden />
        </span>
        <span className="mono" style={s.name}>
          {skill.name}
        </span>
        <span
          onClick={(e) => e.stopPropagation()}
          title={t(skill.enabled ? "list.disable" : "list.enable", { name: skill.name })}
        >
          <Toggle on={skill.enabled} onChange={onToggle} size={14} />
        </span>
      </div>
      <div style={s.description}>{skill.description}</div>
      <div style={s.meta}>
        <span style={s.typeChip(type.c, type.bg)}>{t(`listItem.type.${skill.type}`)}</span>
        <span style={s.source}>
          <SourceIcon size={11} aria-hidden />
          {t(`listItem.source.${skill.source}`)}
        </span>
        {needsVetting(skill) && (
          <Badge color="var(--warn)" bg="var(--warn-bg)">
            <span title={t("listItem.vettingTitle")}>{t("listItem.needsVetting")}</span>
          </Badge>
        )}
      </div>
      <div className="tnum" style={s.usage}>
        {t("list.agents", { count: skill.linked_agents })}
      </div>
    </div>
  );
}

export default SkillCard;
