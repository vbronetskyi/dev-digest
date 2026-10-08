/* ConventionCard — one extracted convention: the rule, the quoted evidence with
   its line range, confidence, and Accept as Skill / Edit first / Reject. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, FormField, IconBtn, MonoLink, ProgressBar, TextInput, Textarea } from "@devdigest/ui";
import type { ConventionAcceptRequest, ConventionCandidate } from "@devdigest/shared";
// Runtime schema from the contract file: a value import from the barrel breaks the Next build.
import { SkillName } from "@/vendor/shared/contracts/knowledge";
import { githubBlobUrl } from "@/lib/github-urls";
import { notify } from "@/lib/toast";
import { confidenceColor, parseEvidence, splitInlineCode } from "../../helpers";
import { s } from "./styles";

export function ConventionCard({
  candidate,
  repoFullName,
  branch,
  busy,
  skillId,
  onAccept,
  onReject,
  onOpenSkill,
}: {
  candidate: ConventionCandidate;
  repoFullName: string;
  branch: string;
  busy: boolean;
  /** Known when the candidate was accepted in this session. */
  skillId?: string;
  onAccept: (overrides: ConventionAcceptRequest) => void;
  onReject: () => void;
  onOpenSkill: (skillId: string) => void;
}) {
  const t = useTranslations("conventions");
  const [editing, setEditing] = React.useState(false);
  const [rule, setRule] = React.useState(candidate.rule);
  const [name, setName] = React.useState("");
  const ev = parseEvidence(candidate.evidence_path);
  const pct = Math.round(candidate.confidence * 100);
  const nameInvalid = name !== "" && !SkillName.safeParse(name).success;
  // Once accepted (also after "Edit first") the card is read-only.
  const showEditor = editing && !candidate.accepted;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(candidate.evidence_snippet);
      notify.success(t("card.copied"));
    } catch {
      /* clipboard blocked (insecure context) — nothing to do */
    }
  };

  const accept = () =>
    onAccept(
      editing
        ? { ...(rule.trim() !== candidate.rule ? { rule: rule.trim() } : {}), ...(name ? { name } : {}) }
        : {},
    );

  return (
    <article style={s.card(candidate.accepted)} aria-label={candidate.rule}>
      <div style={s.row}>
        <div style={s.main}>
          {showEditor ? (
            <div style={s.edit}>
              <FormField label={t("card.rule")}>
                <Textarea value={rule} onChange={setRule} rows={2} />
              </FormField>
              <FormField label={t("card.name")} hint={t("card.nameHint")}>
                <TextInput value={name} onChange={setName} mono placeholder={t("card.namePlaceholder")} />
              </FormField>
            </div>
          ) : (
            <p style={s.rule}>
              {splitInlineCode(candidate.rule).map((part, i) =>
                i % 2 ? (
                  <code key={i} className="mono" style={s.code}>
                    {part}
                  </code>
                ) : (
                  part
                ),
              )}
            </p>
          )}
          <div style={s.evidence}>
            <div style={s.evidenceHead}>
              <MonoLink href={githubBlobUrl(repoFullName, branch, ev.file, ev.start, ev.end)}>
                {candidate.evidence_path}
              </MonoLink>
              <IconBtn icon="Copy" size={24} label={t("card.copy")} onClick={copy} />
            </div>
            <pre className="mono" style={s.pre}>
              {candidate.evidence_snippet}
            </pre>
          </div>
          <div style={s.confidence}>
            <span style={s.confidenceLabel}>{t("card.confidence")}</span>
            <div style={s.bar}>
              <ProgressBar value={pct} height={5} color={confidenceColor(candidate.confidence)} />
            </div>
            <span className="mono tnum" style={s.pct}>
              {pct}%
            </span>
          </div>
        </div>

        {candidate.accepted ? (
          <div style={s.accepted}>
            <Badge color="var(--ok)" bg="var(--ok-bg)" icon="Check">
              {t("card.accepted")}
            </Badge>
            {skillId && <MonoLink onClick={() => onOpenSkill(skillId)}>{t("card.openSkill")}</MonoLink>}
          </div>
        ) : showEditor ? (
          <div style={s.actions}>
            <Button kind="primary" size="sm" icon="Sparkles" full loading={busy} disabled={!rule.trim() || nameInvalid} onClick={accept}>
              {busy ? t("card.accepting") : t("card.acceptAsSkill")}
            </Button>
            <Button
              kind="ghost"
              size="sm"
              full
              onClick={() => {
                setEditing(false);
                setRule(candidate.rule);
                setName("");
              }}
            >
              {t("card.cancel")}
            </Button>
          </div>
        ) : (
          <div style={s.actions}>
            <Button kind="primary" size="sm" icon="Sparkles" full loading={busy} onClick={accept}>
              {busy ? t("card.accepting") : t("card.acceptAsSkill")}
            </Button>
            <Button kind="ghost" size="sm" icon="Edit" full disabled={busy} onClick={() => setEditing(true)}>
              {t("card.editFirst")}
            </Button>
            <Button kind="ghost" size="sm" icon="X" full disabled={busy} onClick={onReject}>
              {t("card.reject")}
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

export default ConventionCard;
