/* /skills — Skills Lab: library on the left, editor on the right.
   Selection and tab live in the URL (?skill=<id>|new, ?tab=) so a skill is linkable. */
"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { EmptyState, ErrorState } from "@devdigest/ui";
import { AppShell } from "@/components/app-shell";
import { useSkills } from "@/lib/hooks/skills";
import { ApiError } from "@/lib/api";
import { ImportSkillDrawer } from "./_components/ImportSkillDrawer";
import { SkillEditor } from "./_components/SkillEditor";
import { SkillList } from "./_components/SkillList";
import { EDITOR_TABS, NEW_SKILL, type ImportMode } from "./constants";
import { s } from "./styles";

const DEFAULT_TAB = "config";

export default function SkillsPage() {
  const t = useTranslations("skills");
  const router = useRouter();
  const search = useSearchParams();
  const { data: skills, isLoading, isError, error, refetch } = useSkills();
  const [importing, setImporting] = React.useState<ImportMode | null>(null);

  const selected = search.get("skill");
  const requestedTab = search.get("tab") ?? "";
  const tab = EDITOR_TABS.some((tb) => tb.key === requestedTab) ? requestedTab : DEFAULT_TAB;

  const go = (skill: string | null, nextTab: string = DEFAULT_TAB) => {
    const sp = new URLSearchParams();
    if (skill) sp.set("skill", skill);
    if (skill && skill !== NEW_SKILL && nextTab !== DEFAULT_TAB) sp.set("tab", nextTab);
    const qs = sp.toString();
    router.replace(qs ? `/skills?${qs}` : "/skills");
  };

  const crumb = [{ label: t("page.crumbLab") }, { label: t("page.crumbSkills") }];

  if (isError) {
    return (
      <AppShell crumb={crumb}>
        <ErrorState
          fullScreen
          title={t("page.loadError")}
          body={error instanceof ApiError ? error.message : undefined}
          onRetry={() => refetch()}
        />
      </AppShell>
    );
  }

  return (
    <AppShell crumb={crumb}>
      <div style={s.layout}>
        <SkillList
          skills={skills}
          loading={isLoading}
          selectedId={selected}
          onSelect={(id) => go(id, tab)}
          onCreate={() => go(NEW_SKILL)}
          onImport={setImporting}
        />
        <main style={s.main}>
          {selected ? (
            <SkillEditor
              skillId={selected === NEW_SKILL ? null : selected}
              tab={tab}
              onTab={(next) => go(selected, next)}
              onCreated={(skill) => go(skill.id)}
              onDeleted={() => go(null)}
            />
          ) : (
            <div style={s.center}>
              <EmptyState icon="Sparkles" title={t("page.selectPrompt.title")} body={t("page.selectPrompt.body")} />
            </div>
          )}
        </main>
      </div>
      {importing && (
        <ImportSkillDrawer
          initialMode={importing}
          onClose={() => setImporting(null)}
          onImported={(skill) => {
            setImporting(null);
            go(skill.id);
          }}
        />
      )}
    </AppShell>
  );
}
