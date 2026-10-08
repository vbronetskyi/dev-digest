/* ImportSkillDrawer — import a SKILL.md from a URL in two steps: the server
   fetches and parses it (nothing saved), a human reads the body and warnings,
   then imports. Imported skills land disabled until someone vets them. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, Drawer, FormField, Icon, SelectInput, TextInput } from "@devdigest/ui";
import type { Skill, SkillImportPreview, SkillType } from "@devdigest/shared";
// Runtime schemas come from the contract file: a value import from the
// @devdigest/shared barrel breaks the Next build (see src/lib/feature-models.ts).
import { SkillName } from "@/vendor/shared/contracts/knowledge";
import { useImportSkill, usePreviewSkillImport } from "@/lib/hooks/skills";
import { ApiError } from "@/lib/api";
import { notify } from "@/lib/toast";
import { SKILL_TYPES } from "@/lib/skills";
import { s } from "./styles";

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function ImportSkillDrawer({ onClose, onImported }: { onClose: () => void; onImported: (skill: Skill) => void }) {
  const t = useTranslations("skills");
  const previewMutation = usePreviewSkillImport();
  const importMutation = useImportSkill();
  const [url, setUrl] = React.useState("");
  const [preview, setPreview] = React.useState<SkillImportPreview | null>(null);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<SkillType>("custom");

  const fetchPreview = () =>
    previewMutation.mutate(url.trim(), {
      onSuccess: (p) => {
        setPreview(p);
        setName(p.name);
        setType(p.type);
      },
    });

  const nameError = preview && !SkillName.safeParse(name).success ? t("config.nameHint") : null;

  const runImport = () => {
    if (!preview || nameError) return;
    // Import the URL the server actually fetched, so the stored body is what was previewed.
    importMutation.mutate(
      { url: preview.source_url, name, type },
      {
        onSuccess: (skill) => {
          notify.success(t("url.success", { name: skill.name }));
          onImported(skill);
        },
      },
    );
  };

  const footer = preview ? (
    <div style={s.footer}>
      <Button kind="ghost" onClick={() => setPreview(null)}>
        {t("import.back")}
      </Button>
      <Button kind="primary" icon="Upload" loading={importMutation.isPending} disabled={!!nameError} onClick={runImport}>
        {t("url.import")}
      </Button>
    </div>
  ) : (
    <div style={s.footer}>
      <Button kind="ghost" onClick={onClose}>
        {t("config.cancel")}
      </Button>
      <Button
        kind="primary"
        icon="Eye"
        loading={previewMutation.isPending}
        disabled={!url.trim()}
        onClick={fetchPreview}
      >
        {previewMutation.isPending ? t("url.fetching") : t("import.preview")}
      </Button>
    </div>
  );

  return (
    <Drawer width={640} title={t("drawer.title")} subtitle={t("url.hint")} onClose={onClose} footer={footer}>
      <div style={s.body}>
        {!preview ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (url.trim()) fetchPreview();
            }}
          >
            <FormField label={t("url.label")}>
              <TextInput value={url} onChange={setUrl} placeholder={t("url.placeholder")} mono autoFocus type="url" />
            </FormField>
            {previewMutation.isError && (
              <p role="alert" style={s.error}>
                {messageOf(previewMutation.error, t("drawer.importFailed"))}
              </p>
            )}
          </form>
        ) : (
          <>
            <p className="mono" style={s.source}>
              {t("import.fetchedFrom")}: {preview.source_url}
            </p>
            {preview.warnings.length > 0 && (
              <div style={s.warnings} role="note">
                <div style={s.warningsTitle}>
                  <Icon.AlertTriangle size={14} aria-hidden />
                  {t("import.warnings")}
                </div>
                <ul style={s.warningList}>
                  {preview.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            <div style={s.row}>
              <FormField label={t("import.name")} hint={nameError ?? undefined}>
                <TextInput value={name} onChange={setName} mono />
              </FormField>
              <FormField label={t("import.type")}>
                <SelectInput
                  value={type}
                  onChange={(v) => setType(v as SkillType)}
                  options={SKILL_TYPES.map((v) => ({ value: v, label: t(`listItem.type.${v}`) }))}
                />
              </FormField>
            </div>
            {preview.description && (
              <FormField label={t("import.description")}>
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{preview.description}</p>
              </FormField>
            )}
            <FormField label={t("import.body")}>
              <pre className="mono" style={s.pre}>
                {preview.body}
              </pre>
            </FormField>
            {importMutation.isError && (
              <p role="alert" style={s.error}>
                {messageOf(importMutation.error, t("drawer.importFailed"))}
              </p>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}

export default ImportSkillDrawer;
