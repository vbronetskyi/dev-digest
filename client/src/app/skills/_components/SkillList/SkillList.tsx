/* SkillList — left pane of the Skills Lab: add menu, search and the skill cards. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, Dropdown, EmptyState, Skeleton, TextInput } from "@devdigest/ui";
import type { SkillListItem } from "@devdigest/shared";
import { useUpdateSkill } from "@/lib/hooks/skills";
import { SkillCard } from "../SkillCard";
import { filterSkills } from "@/lib/skills";
import { s } from "./styles";

export function SkillList({
  skills,
  loading,
  selectedId,
  onSelect,
  onCreate,
  onImport,
}: {
  skills: SkillListItem[] | undefined;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onImport: () => void;
}) {
  const t = useTranslations("skills");
  const update = useUpdateSkill();
  const [query, setQuery] = React.useState("");
  const shown = filterSkills(skills ?? [], query);

  return (
    <aside style={s.pane}>
      <div style={s.header}>
        <div style={s.titleRow}>
          <h1 style={s.title}>{t("page.heading")}</h1>
          <Dropdown
            width={220}
            align="right"
            trigger={
              <Button kind="primary" size="sm" icon="Plus" iconRight="ChevronDown">
                {t("page.addSkill")}
              </Button>
            }
            items={[
              { label: t("page.menu.fromUrl"), icon: "Link", onClick: onImport },
              { divider: true },
              { label: t("list.create"), icon: "Edit", onClick: onCreate },
            ]}
          />
        </div>
        <TextInput value={query} onChange={setQuery} placeholder={t("page.searchPlaceholder")} />
      </div>
      {loading ? (
        <div style={s.skeletons}>
          <Skeleton height={92} />
          <Skeleton height={92} />
        </div>
      ) : (skills ?? []).length === 0 ? (
        <EmptyState icon="Sparkles" title={t("page.empty.title")} body={t("page.empty.body")} />
      ) : (
        <div style={s.list}>
          {shown.length === 0 ? (
            <EmptyState icon="Search" title={t("list.noMatch")} />
          ) : (
            shown.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                active={skill.id === selectedId}
                onSelect={() => onSelect(skill.id)}
                onToggle={(enabled) => update.mutate({ id: skill.id, patch: { enabled } })}
              />
            ))
          )}
        </div>
      )}
    </aside>
  );
}

export default SkillList;
