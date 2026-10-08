/* SkillVersions — body snapshots, newest first. An older version can be viewed,
   diffed against the current body, or restored (which saves it as a new version). */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Skeleton } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { useSkillVersions, useUpdateSkill } from "@/lib/hooks/skills";
import { lineDiff } from "../../helpers";
import { s } from "./styles";

type Open = { version: number; mode: "view" | "diff" } | null;

export function SkillVersions({ skill }: { skill: Skill }) {
  const t = useTranslations("skills");
  const { data: versions, isLoading } = useSkillVersions(skill.id);
  const update = useUpdateSkill();
  const [open, setOpen] = React.useState<Open>(null);
  if (isLoading || !versions) return <Skeleton height={120} />;

  const toggle = (version: number, mode: "view" | "diff") =>
    setOpen((o) => (o?.version === version && o.mode === mode ? null : { version, mode }));

  return (
    <div style={s.wrap}>
      <div style={s.head}>
        <h2 style={s.title}>{t("versions.title")}</h2>
        <Badge color="var(--text-secondary)">{t("versions.count", { count: versions.length })}</Badge>
      </div>
      <p style={s.subtitle}>{t("versions.subtitle")}</p>
      <div style={s.list}>
        {versions.map((v) => {
          const current = v.version === skill.version;
          const expanded = open?.version === v.version ? open.mode : null;
          return (
            <div key={v.version} style={s.row(current)}>
              <div style={s.rowHead}>
                <span className="mono" style={s.chip(current)}>
                  v{v.version}
                </span>
                <span style={s.date}>{new Date(v.created_at).toLocaleString()}</span>
                {current ? (
                  <Badge color="var(--ok)" bg="var(--ok-bg)" dot>
                    {t("versions.current")}
                  </Badge>
                ) : (
                  <div style={s.actions}>
                    <Button kind="ghost" size="sm" icon="Eye" onClick={() => toggle(v.version, "view")}>
                      {expanded === "view" ? t("versions.hide") : t("versions.view")}
                    </Button>
                    <Button kind="ghost" size="sm" icon="FileText" onClick={() => toggle(v.version, "diff")}>
                      {t("versions.compare")}
                    </Button>
                    <Button
                      kind="secondary"
                      size="sm"
                      icon="History"
                      loading={update.isPending}
                      onClick={() => {
                        if (window.confirm(t("versions.restoreConfirm", { version: v.version }))) {
                          update.mutate({ id: skill.id, patch: { body: v.body } });
                        }
                      }}
                    >
                      {t("versions.restore")}
                    </Button>
                  </div>
                )}
              </div>
              {expanded === "view" && (
                <pre className="mono" style={s.pre}>
                  {v.body}
                </pre>
              )}
              {expanded === "diff" && (
                <pre className="mono" style={{ ...s.pre, padding: "12px 0" }} aria-label={`v${v.version} → v${skill.version}`}>
                  {v.body === skill.body
                    ? t("versions.noDiff")
                    : lineDiff(v.body, skill.body).map((line, i) => (
                        <span key={i} style={s.diffLine(line.kind)}>
                          {line.kind === "add" ? "+ " : line.kind === "del" ? "- " : "  "}
                          {line.text}
                        </span>
                      ))}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SkillVersions;
