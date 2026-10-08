"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Icon, MonoLink } from "@devdigest/ui";
import type { BlastRadius } from "@devdigest/shared";
import { githubBlobUrl } from "@/lib/github-urls";
import { s } from "./styles";

/** Changed symbols, each expandable to its callers and the endpoints / crons behind them. */
export function BlastTree({ blast, repo, sha }: { blast: BlastRadius; repo: string; sha: string }) {
  const t = useTranslations("blast");
  const [open, setOpen] = React.useState<ReadonlySet<string>>(() => new Set(blast.downstream.slice(0, 1).map((d) => d.symbol)));
  const toggle = (sym: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label={t("title")}>
      {blast.downstream.map((d, i) => {
        const sym = blast.changed_symbols[i];
        const isOpen = open.has(d.symbol);
        return (
          <li key={`${d.symbol}:${sym?.file ?? i}`}>
            <button type="button" style={s.symbolRow(isOpen)} aria-expanded={isOpen} onClick={() => toggle(d.symbol)}>
              <Icon.ChevronRight size={13} style={s.chevron(isOpen)} aria-hidden />
              <Icon.Code size={13} style={{ color: "var(--accent)", flexShrink: 0 }} aria-hidden />
              <span className="mono" style={s.symbolName}>
                {d.symbol}()
              </span>
              {sym && (
                <span className="mono" style={s.symbolFile}>
                  {sym.file}
                </span>
              )}
              <span style={s.callerCount}>{t("callerCount", { count: d.callers.length })}</span>
            </button>
            {isOpen && (
              <div style={s.branch}>
                {d.callers.length === 0 ? (
                  <div style={s.muted}>{t("noCallers")}</div>
                ) : (
                  d.callers.map((c) => (
                    <div key={`${c.file}:${c.line}`} style={s.callerRow}>
                      <Icon.CornerDownRight size={13} style={{ color: "var(--text-muted)" }} aria-hidden />
                      <MonoLink href={githubBlobUrl(repo, sha, c.file, c.line)}>{`${c.file}:${c.line}`}</MonoLink>
                      <span className="mono" style={s.callerName}>
                        {c.name}
                      </span>
                    </div>
                  ))
                )}
                {(d.endpoints_affected.length > 0 || d.crons_affected.length > 0) && (
                  <div style={s.badges}>
                    {d.endpoints_affected.map((e) => (
                      <Badge key={e} mono icon="Globe" color="var(--accent-text)" bg="var(--accent-bg)">
                        {e}
                      </Badge>
                    ))}
                    {d.crons_affected.map((c) => (
                      <Badge key={c} mono icon="Clock" color="var(--warn)" bg="var(--warn-bg)">
                        {c}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
