/* SkillPreview — the body as the reviewing agent receives it: rendered, or as
   the exact delimited block that goes into the prompt. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Markdown } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { promptBlock } from "../../helpers";
import { s } from "./styles";

export function SkillPreview({ skill }: { skill: Skill }) {
  const t = useTranslations("skills");
  const [view, setView] = React.useState<"rendered" | "raw">("rendered");
  return (
    <div style={s.wrap}>
      <div style={s.head}>
        <div style={{ flex: 1 }}>
          <h2 style={s.title}>{t("preview.title")}</h2>
          <p style={s.subtitle}>{t("preview.subtitle")}</p>
        </div>
        <div style={s.switcher} role="group">
          {(["rendered", "raw"] as const).map((v) => (
            <Button key={v} kind="tertiary" size="sm" active={view === v} aria-pressed={view === v} onClick={() => setView(v)}>
              {t(`preview.${v}`)}
            </Button>
          ))}
        </div>
      </div>
      {view === "rendered" ? (
        <Card>
          <Markdown>{skill.body}</Markdown>
        </Card>
      ) : (
        <pre className="mono" style={s.raw}>
          {promptBlock(skill.name, skill.body)}
        </pre>
      )}
    </div>
  );
}

export default SkillPreview;
