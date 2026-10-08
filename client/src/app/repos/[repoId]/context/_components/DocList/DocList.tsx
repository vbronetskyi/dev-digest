/* DocList — the repo's context documents grouped by folder kind (specs, docs,
   insights), each with its directory and token estimate. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@devdigest/ui";
import type { ContextDoc } from "@devdigest/shared";
import { dirOf, formatTokens, groupByFolder, FOLDER_COLOR } from "@/components/context-doc";
import { s, itemFor } from "./styles";

export function DocList({ docs, selected, onSelect }: { docs: ContextDoc[]; selected: string; onSelect: (path: string) => void }) {
  const t = useTranslations("context");
  return (
    <nav style={s.wrap} aria-label={t("page.list")}>
      {groupByFolder(docs).map((g) => (
        <section key={g.folder} style={s.group} aria-label={t(`folder.${g.folder}`)}>
          <h2 style={s.groupHead}>
            <span style={{ ...s.dot, background: FOLDER_COLOR[g.folder].c }} aria-hidden />
            {t(`folder.${g.folder}`)}
            <span className="tnum" style={s.groupCount}>
              {g.docs.length}
            </span>
          </h2>
          {g.docs.map((d) => {
            const active = d.path === selected;
            return (
              <button key={d.path} type="button" style={itemFor(active)} aria-current={active ? "true" : undefined} onClick={() => onSelect(d.path)} title={d.path}>
                <Icon.FileText size={13} style={{ color: active ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }} aria-hidden />
                <span style={s.texts}>
                  <span className="mono" style={s.name}>
                    {d.name}
                  </span>
                  <span className="mono" style={s.dir}>
                    {dirOf(d.path)}
                  </span>
                </span>
                <span className="mono tnum" style={s.tokens}>
                  {formatTokens(d.tokens)}
                </span>
              </button>
            );
          })}
        </section>
      ))}
    </nav>
  );
}
