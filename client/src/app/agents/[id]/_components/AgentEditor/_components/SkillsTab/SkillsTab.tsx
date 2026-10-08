"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge, Checkbox, EmptyState, Icon, IconBtn, Skeleton, TextInput } from "@devdigest/ui";
import type { SkillListItem } from "@devdigest/shared";
import { useAgentSkills, useSetAgentSkills, useSkills } from "@/lib/hooks/skills";
import { notify } from "@/lib/toast";
import { SKILL_TYPE_META, filterSkills } from "@/lib/skills";
import { moveItem, orderedLinked } from "./helpers";
import { s } from "./styles";

/**
 * Skills tab — which library skills this agent gets, and in what order.
 * Order is prompt order, so it is editable by drag and by the arrow buttons
 * (the keyboard path). Every change saves immediately (optimistic).
 */
export function SkillsTab({ agentId }: { agentId: string }) {
  const t = useTranslations("agents");
  const tSkills = useTranslations("skills");
  const router = useRouter();
  const { data: library, isLoading: libraryLoading } = useSkills();
  const { data: links, isLoading: linksLoading } = useAgentSkills(agentId);
  const setSkills = useSetAgentSkills(agentId);
  const [query, setQuery] = React.useState("");
  const [dragFrom, setDragFrom] = React.useState<number | null>(null);
  const [dragOver, setDragOver] = React.useState<number | null>(null);

  if (libraryLoading || linksLoading) return <Skeleton height={160} />;
  if (!library?.length) {
    return (
      <EmptyState
        icon="Sparkles"
        title={t("skills.emptyLibraryTitle")}
        body={t("skills.emptyLibraryBody")}
        cta={t("skills.openLibrary")}
        onCta={() => router.push("/skills")}
      />
    );
  }

  const linked = orderedLinked(links ?? [], library);
  const linkedIds = new Set(linked.map((sk) => sk.id));
  const available = filterSkills(
    library.filter((sk) => !linkedIds.has(sk.id)),
    query,
  );

  const save = (next: SkillListItem[]) =>
    setSkills.mutate(
      next.map((sk) => sk.id),
      { onError: () => notify.error(t("skills.saveError")) },
    );
  const move = (from: number, to: number) => save(moveItem(linked, from, to));
  const endDrag = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  const chip = (sk: SkillListItem) => {
    const meta = SKILL_TYPE_META[sk.type];
    return <span style={s.chip(meta.c, meta.bg)}>{tSkills(`listItem.type.${sk.type}`)}</span>;
  };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h2 style={s.h2}>{t("skills.title")}</h2>
        <Badge color="var(--text-secondary)">
          {t("skills.enabledCount", { linked: linked.length, total: library.length })}
        </Badge>
      </div>
      <p style={s.hint}>{t("skills.orderHint")}</p>

      <h3 style={s.section}>{t("skills.linked")}</h3>
      {linked.length === 0 ? (
        <p style={s.none}>{t("skills.noneLinked")}</p>
      ) : (
        <ol style={s.list} aria-label={t("skills.linked")}>
          {linked.map((sk, i) => (
            <li
              key={sk.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                // Firefox does not start a drag without data on the transfer.
                e.dataTransfer.setData("text/plain", sk.id);
                setDragFrom(i);
              }}
              onDragOver={(e) => {
                if (dragFrom === null) return;
                e.preventDefault();
                setDragOver(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFrom !== null) move(dragFrom, i);
                endDrag();
              }}
              onDragEnd={endDrag}
              style={s.row(dragOver === i && dragFrom !== i, dragFrom === i)}
            >
              <span style={s.handle} title={t("skills.drag")} aria-hidden>
                <Icon.Menu size={14} />
              </span>
              <span className="mono" style={s.order}>
                {i + 1}
              </span>
              <Checkbox
                checked
                onChange={() => save(linked.filter((x) => x.id !== sk.id))}
                label={
                  <span className="mono" style={s.name}>
                    {sk.name}
                  </span>
                }
              />
              {chip(sk)}
              <span style={s.desc}>{sk.description}</span>
              {!sk.enabled && (
                <span title={t("skills.disabledHint")}>
                  <Badge color="var(--warn)" bg="var(--warn-bg)">
                    {t("skills.disabled")}
                  </Badge>
                </span>
              )}
              <div style={s.arrows}>
                {i > 0 && (
                  <IconBtn icon="ArrowUp" size={26} label={t("skills.moveUp", { name: sk.name })} onClick={() => move(i, i - 1)} />
                )}
                {i < linked.length - 1 && (
                  <IconBtn
                    icon="ArrowDown"
                    size={26}
                    label={t("skills.moveDown", { name: sk.name })}
                    onClick={() => move(i, i + 1)}
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <h3 style={s.section}>{t("skills.available")}</h3>
      <div style={s.filter}>
        <TextInput value={query} onChange={setQuery} placeholder={t("skills.filterPlaceholder")} />
      </div>
      <ul style={s.list} aria-label={t("skills.available")}>
        {available.map((sk) => (
          <li key={sk.id} style={s.row(false, false)}>
            <Checkbox
              checked={false}
              onChange={() => save([...linked, sk])}
              label={
                <span className="mono" style={s.name}>
                  {sk.name}
                </span>
              }
            />
            {chip(sk)}
            <span style={s.desc}>{sk.description}</span>
            {!sk.enabled && (
              <span title={t("skills.disabledHint")}>
                <Badge color="var(--text-muted)">{t("skills.disabled")}</Badge>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
