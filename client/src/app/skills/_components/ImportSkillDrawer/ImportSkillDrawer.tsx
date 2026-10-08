/* ImportSkillDrawer — import a SKILL.md from a file (upload or paste) or a URL,
   in two steps: the server parses it (nothing saved), a human reads the body and
   warnings, then imports. Imported skills land disabled until someone vets them. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, Drawer, FormField, Icon, SelectInput, Tabs, TextInput, Textarea } from "@devdigest/ui";
import type { Skill, SkillImportPreview, SkillType } from "@devdigest/shared";
// Runtime schemas come from the contract file: a value import from the
// @devdigest/shared barrel breaks the Next build (see src/lib/feature-models.ts).
import { SKILL_FILE_MAX_CHARS, SkillName } from "@/vendor/shared/contracts/knowledge";
import { useImportSkill, useImportSkillFile, usePreviewSkillFile, usePreviewSkillImport } from "@/lib/hooks/skills";
import { ApiError } from "@/lib/api";
import { notify } from "@/lib/toast";
import { SKILL_TYPES } from "@/lib/skills";
import { IMPORT_MODES, type ImportMode } from "../../constants";
import { s } from "./styles";

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

const formatSize = (bytes: number) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);

export function ImportSkillDrawer({
  initialMode = "url",
  onClose,
  onImported,
}: {
  initialMode?: ImportMode;
  onClose: () => void;
  onImported: (skill: Skill) => void;
}) {
  const t = useTranslations("skills");
  const urlPreview = usePreviewSkillImport();
  const urlImport = useImportSkill();
  const filePreview = usePreviewSkillFile();
  const fileImport = useImportSkillFile();
  const [mode, setMode] = React.useState<ImportMode>(initialMode);
  const [url, setUrl] = React.useState("");
  const [text, setText] = React.useState("");
  const [file, setFile] = React.useState<{ name: string; size: number } | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<SkillImportPreview | null>(null);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<SkillType>("custom");
  const fileInput = React.useRef<HTMLInputElement>(null);

  const previewMutation = mode === "url" ? urlPreview : filePreview;
  const importMutation = mode === "url" ? urlImport : fileImport;
  const ready = mode === "url" ? !!url.trim() : !!text.trim();

  const showPreview = (p: SkillImportPreview) => {
    setPreview(p);
    setName(p.name);
    setType(p.type);
  };
  const fetchPreview = () => {
    if (!ready) return;
    if (mode === "url") urlPreview.mutate(url.trim(), { onSuccess: showPreview });
    else filePreview.mutate({ text, ...(file ? { filename: file.name } : {}) }, { onSuccess: showPreview });
  };

  const pickFile = async (picked: File | undefined) => {
    if (!picked) return;
    setFileError(null);
    if (picked.size > SKILL_FILE_MAX_CHARS) {
      setFileError(t("file.tooLarge"));
      return;
    }
    setFile({ name: picked.name, size: picked.size });
    setText(await picked.text());
  };

  const nameError = preview && !SkillName.safeParse(name).success ? t("config.nameHint") : null;

  const runImport = () => {
    if (!preview || nameError) return;
    const done = {
      onSuccess: (skill: Skill) => {
        notify.success(t(mode === "url" ? "url.success" : "file.success", { name: skill.name }));
        onImported(skill);
      },
    };
    // A URL import sends the URL the server actually fetched, so the stored body is what was previewed.
    if (mode === "url") urlImport.mutate({ url: preview.source_url ?? url.trim(), name, type }, done);
    else fileImport.mutate({ text, ...(file ? { filename: file.name } : {}), name, type }, done);
  };

  const footer = preview ? (
    <div style={s.footer}>
      <Button kind="ghost" onClick={() => setPreview(null)}>
        {t("import.back")}
      </Button>
      <Button kind="primary" icon="Upload" loading={importMutation.isPending} disabled={!!nameError} onClick={runImport}>
        {mode === "url" ? t("url.import") : t("file.import")}
      </Button>
    </div>
  ) : (
    <div style={s.footer}>
      <Button kind="ghost" onClick={onClose}>
        {t("config.cancel")}
      </Button>
      <Button kind="primary" icon="Eye" loading={previewMutation.isPending} disabled={!ready} onClick={fetchPreview}>
        {previewMutation.isPending && mode === "url" ? t("url.fetching") : t("import.preview")}
      </Button>
    </div>
  );

  const tabs = IMPORT_MODES.map((m) => ({ key: m, label: t(`drawer.tabs.${m}`), icon: m === "file" ? ("Upload" as const) : ("Link" as const) }));

  return (
    <Drawer width={640} title={t("drawer.title")} subtitle={t("drawer.subtitle")} onClose={onClose} footer={footer}>
      <div style={s.body}>
        {!preview ? (
          <>
            <div style={s.tabs}>
              <Tabs tabs={tabs} value={mode} onChange={(m) => setMode(m as ImportMode)} pad="0 24px" />
            </div>
            {mode === "url" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchPreview();
                }}
              >
                <FormField label={t("url.label")} hint={t("url.hint")}>
                  <TextInput value={url} onChange={setUrl} placeholder={t("url.placeholder")} mono autoFocus type="url" />
                </FormField>
              </form>
            ) : (
              <>
                <div style={s.pickRow}>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".md,.markdown,.txt,text/markdown,text/plain"
                    hidden
                    aria-label={t("file.pick")}
                    onChange={(e) => pickFile(e.target.files?.[0])}
                  />
                  <Button kind="secondary" size="sm" icon="Upload" onClick={() => fileInput.current?.click()}>
                    {t("file.pick")}
                  </Button>
                  {file && (
                    <span className="mono" style={s.picked}>
                      {t("file.picked", { name: file.name, size: formatSize(file.size) })}
                    </span>
                  )}
                </div>
                {fileError && (
                  <p role="alert" style={s.error}>
                    {fileError}
                  </p>
                )}
                <p style={s.or}>{t("file.or")}</p>
                <FormField label={t("file.bodyLabel")} hint={t("file.bodyHint")}>
                  <Textarea
                    value={text}
                    onChange={(v) => {
                      setText(v);
                      if (!v) setFile(null);
                    }}
                    rows={12}
                    mono
                    placeholder={t("file.bodyPlaceholder")}
                  />
                </FormField>
              </>
            )}
            {previewMutation.isError && (
              <p role="alert" style={s.error}>
                {messageOf(previewMutation.error, t("drawer.importFailed"))}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mono" style={s.source}>
              {mode === "url"
                ? `${t("import.fetchedFrom")}: ${preview.source_url}`
                : `${t("file.source")}: ${file?.name ?? t("file.pasted")}`}
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
