/* SkillConfigForm — Config tab of the skill editor, and the create form.
   Validates with the shared SkillInput contract before talking to the API. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, FormField, Icon, MonoLink, SelectInput, TextInput, Textarea, Toggle } from "@devdigest/ui";
import type { Skill, SkillType } from "@devdigest/shared";
// Runtime schemas come from the contract file: a value import from the
// @devdigest/shared barrel breaks the Next build (see src/lib/feature-models.ts).
import { SkillInput } from "@/vendor/shared/contracts/knowledge";
import { useCreateSkill, useDeleteSkill, useUpdateSkill } from "@/lib/hooks/skills";
import { ApiError } from "@/lib/api";
import { notify } from "@/lib/toast";
import { SKILL_TYPES } from "@/lib/skills";
import { UNTRUSTED_SOURCES } from "../../constants";
import { estimateTokens } from "../../helpers";
import { s } from "./styles";

type Draft = { name: string; description: string; type: SkillType; body: string; enabled: boolean };

const EMPTY: Draft = { name: "", description: "", type: "rubric", body: "", enabled: true };

function draftOf(skill: Skill | undefined): Draft {
  return skill
    ? { name: skill.name, description: skill.description, type: skill.type, body: skill.body, enabled: skill.enabled }
    : EMPTY;
}

export function SkillConfigForm({
  skill,
  onCreated,
  onDeleted,
}: {
  /** Absent → create mode. */
  skill?: Skill;
  onCreated?: (skill: Skill) => void;
  onDeleted?: () => void;
}) {
  const t = useTranslations("skills");
  const create = useCreateSkill();
  const update = useUpdateSkill();
  const remove = useDeleteSkill();
  const [draft, setDraft] = React.useState<Draft>(() => draftOf(skill));
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const original = draftOf(skill);
  const dirty = (Object.keys(draft) as (keyof Draft)[]).some((k) => draft[k] !== original[k]);
  const bodyChanged = skill !== undefined && draft.body.trim() !== skill.body;
  const validation = SkillInput.safeParse(draft);
  const firstIssue = validation.success ? null : validation.error.issues[0];
  const pending = create.isPending || update.isPending;
  const mutationError = (create.error ?? update.error) as Error | null;
  const untrusted = skill !== undefined && UNTRUSTED_SOURCES.includes(skill.source);

  const submit = () => {
    if (!validation.success) return;
    if (!skill) {
      create.mutate(validation.data, {
        onSuccess: (created) => {
          notify.success(t("config.created"));
          onCreated?.(created);
        },
      });
      return;
    }
    update.mutate(
      { id: skill.id, patch: validation.data },
      { onSuccess: () => notify.success(t("config.saved")) },
    );
  };

  return (
    <div style={s.wrap}>
      <div style={s.titleRow}>
        <h2 style={s.title}>{skill ? t("config.title") : t("editor.newTitle")}</h2>
        <label style={s.enabled}>
          {t("preview.enabled")}
          <Toggle on={draft.enabled} onChange={(v) => set("enabled", v)} size={16} />
        </label>
      </div>

      {untrusted && (
        <div style={s.notice} role="note">
          <Icon.AlertTriangle size={15} style={{ color: "var(--warn)", flexShrink: 0, marginTop: 2 }} aria-hidden />
          <div>
            {t("preview.untrustedNotice")}
            {skill?.source_url && (
              <div style={{ marginTop: 4 }}>
                {t("config.source")}{" "}
                <MonoLink href={skill.source_url}>
                  {skill.source_url}
                </MonoLink>
              </div>
            )}
          </div>
        </div>
      )}

      <FormField label={t("config.name")} required hint={t("config.nameHint")}>
        <TextInput value={draft.name} onChange={(v) => set("name", v)} mono placeholder={t("file.namePlaceholder")} />
      </FormField>
      <FormField label={t("config.description")} required>
        <TextInput value={draft.description} onChange={(v) => set("description", v)} />
      </FormField>
      <FormField label={t("config.type")}>
        <SelectInput
          value={draft.type}
          onChange={(v) => set("type", v as SkillType)}
          options={SKILL_TYPES.map((type) => ({ value: type, label: t(`listItem.type.${type}`) }))}
        />
      </FormField>
      <FormField
        label={t("preview.bodyLabel")}
        required
        hint={t("config.bodyHint")}
        right={
          <span className="mono tnum" style={s.tokens}>
            {t("config.tokens", { count: estimateTokens(draft.body) })}
          </span>
        }
      >
        <Textarea
          value={draft.body}
          onChange={(v) => set("body", v)}
          rows={18}
          mono
          placeholder={t("file.bodyPlaceholder")}
        />
      </FormField>

      <div style={s.actions}>
        <Button kind="primary" icon="Check" onClick={submit} loading={pending} disabled={!dirty || !validation.success}>
          {skill ? t("preview.save") : t("config.create")}
        </Button>
        {dirty && (
          <Button kind="ghost" onClick={() => setDraft(original)}>
            {t("config.cancel")}
          </Button>
        )}
        <span style={s.note}>
          {skill && bodyChanged
            ? t("config.snapshotNote", { version: skill.version + 1 })
            : skill && !dirty
              ? t("config.unchanged")
              : null}
        </span>
      </div>
      {dirty && firstIssue && (
        <div style={s.error} role="alert">
          {`${String(firstIssue.path[0] ?? "")}: ${firstIssue.message}`}
        </div>
      )}
      {mutationError && (
        <div style={s.error} role="alert">
          {mutationError instanceof ApiError ? mutationError.message : String(mutationError)}
        </div>
      )}

      {skill && (
        <div style={s.danger}>
          <div style={{ flex: 1 }}>
            <div style={s.dangerTitle}>{t("config.deleteTitle")}</div>
            <div style={s.dangerBody}>{t("config.deleteBody")}</div>
          </div>
          <Button
            kind="danger"
            size="sm"
            icon="Trash"
            loading={remove.isPending}
            onClick={() => {
              if (window.confirm(t("config.deleteConfirm", { name: skill.name }))) {
                remove.mutate(skill.id, { onSuccess: () => onDeleted?.() });
              }
            }}
          >
            {t("config.delete")}
          </Button>
        </div>
      )}
    </div>
  );
}

export default SkillConfigForm;
