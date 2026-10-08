/* TourSection — one collapsible tour section: Markdown body (safe mode), the
   architecture diagram when it parses, and its files linked on GitHub at the
   indexed commit. The reading path is numbered: its order is the point. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon, Markdown } from "@devdigest/ui";
import type { OnboardingSection } from "@devdigest/shared";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { githubBlobUrl } from "@/lib/github-urls";
import { SECTION_ICON } from "../OnboardingTour/constants";
import { s, chevronFor } from "./styles";

export function TourSection({ section, repoFullName, sha }: { section: OnboardingSection; repoFullName: string | null; sha: string | null }) {
  const t = useTranslations("onboarding");
  const [open, setOpen] = React.useState(true);
  const I = Icon[SECTION_ICON[section.kind] ?? "FileText"];
  const numbered = section.kind === "reading_path";
  const List = numbered ? "ol" : "ul";

  return (
    <section id={section.kind} style={s.card} aria-label={section.title}>
      <button type="button" style={s.head} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span style={s.icon} aria-hidden>
          <I size={15} />
        </span>
        <h2 style={s.title}>{section.title}</h2>
        <Icon.ChevronDown size={16} style={chevronFor(open)} aria-hidden />
      </button>
      {open && (
        <div style={s.body}>
          {/* Model prose: no links at all (SPEC-02 AC-12) — the server strips them, this holds if one slips through. */}
          <Markdown safe links="none">
            {section.body}
          </Markdown>
          {section.diagram && (
            <div style={s.diagram}>
              <MermaidDiagram chart={section.diagram} />
            </div>
          )}
          {section.links.length > 0 && (
            <List style={s.links}>
              {section.links.map((l, i) => (
                <li key={`${l.path}-${i}`} style={s.link}>
                  {numbered && (
                    <span className="tnum" style={s.step}>
                      {i + 1}
                    </span>
                  )}
                  <div style={s.linkText}>
                    {repoFullName && sha ? (
                      <a
                        className="mono"
                        style={s.path}
                        href={githubBlobUrl(repoFullName, sha, l.path)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t("openOnGitHub", { path: l.path })}
                      >
                        {l.path}
                      </a>
                    ) : (
                      <span className="mono" style={s.path}>
                        {l.path}
                      </span>
                    )}
                    {l.label !== l.path && <span style={s.label}>{l.label}</span>}
                  </div>
                </li>
              ))}
            </List>
          )}
        </div>
      )}
    </section>
  );
}
