"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Checkbox, Drawer, EmptyState, ErrorState, Icon, IconBtn, Skeleton, TextInput } from "@devdigest/ui";
import type { ContextDoc } from "@devdigest/shared";
import { CONTEXT_SOFT_CAP_TOKENS } from "@/vendor/shared/contracts/knowledge";
import { ContextDocView, FolderChip, dirOf, formatTokens } from "@/components/context-doc";
import { useAgentContext, useContextDocs, useSetAgentContext } from "@/lib/hooks/context";
import { useActiveRepo } from "@/lib/repo-context";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/api";
import { moveItem } from "../../helpers";
import { attachedTokens, baseName, filterDocs } from "./helpers";
import { s } from "./styles";

/**
 * Context tab (L05 SPEC-01) — which of the active repository's specs/, docs/ and
 * insights/ documents this agent reads during reviews, in prompt order. Paths
 * are stored on the agent; a path the active repo lacks stays listed as missing
 * (reviews of that repo skip it). Every change saves immediately (optimistic).
 */
export function ContextTab({ agentId }: { agentId: string }) {
  const t = useTranslations("agents");
  const { repoId, activeRepo } = useActiveRepo();
  const repoName = activeRepo?.full_name ?? "";
  const docsQuery = useContextDocs(repoId);
  const { data: context, isLoading: contextLoading } = useAgentContext(agentId);
  const setContext = useSetAgentContext(agentId);
  const [query, setQuery] = React.useState("");
  const [preview, setPreview] = React.useState<ContextDoc | null>(null);
  const [dragFrom, setDragFrom] = React.useState<number | null>(null);
  const [dragOver, setDragOver] = React.useState<number | null>(null);

  if (!repoId) return <EmptyState icon="Folder" title={t("context.title")} body={t("context.noRepo")} />;
  if (docsQuery.isLoading || contextLoading) return <Skeleton height={160} />;
  if (docsQuery.isError) {
    const err = docsQuery.error;
    return <ErrorState title={t("context.loadError")} body={err instanceof ApiError ? err.message : undefined} onRetry={() => docsQuery.refetch()} />;
  }

  const noClone = docsQuery.data?.reason === "no_clone";
  const docs = docsQuery.data?.docs ?? [];
  const byPath = new Map(docs.map((d) => [d.path, d]));
  const attached = context?.paths ?? [];
  const available = filterDocs(
    docs.filter((d) => !attached.includes(d.path)),
    query,
  );
  const tokens = attachedTokens(attached, byPath);
  const overCap = tokens > CONTEXT_SOFT_CAP_TOKENS;

  const save = (paths: string[]) => setContext.mutate(paths, { onError: () => notify.error(t("context.saveError")) });
  const move = (from: number, to: number) => save(moveItem(attached, from, to));
  const endDrag = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  return (
    <div style={s.wrap}>
      {preview && (
        <Drawer
          width={620}
          onClose={() => setPreview(null)}
          title={
            <span className="mono" style={s.drawerTitle}>
              {preview.path}
            </span>
          }
          subtitle={
            <span style={s.drawerSub}>
              <FolderChip folder={preview.folder} />
              <span className="mono">{t("context.tokens", { tokens: formatTokens(preview.tokens) })}</span>
            </span>
          }
        >
          <ContextDocView repoId={repoId} path={preview.path} />
        </Drawer>
      )}

      <div style={s.header}>
        <h2 style={s.h2}>{t("context.title")}</h2>
        <Badge color="var(--text-secondary)">{t("context.attachedCount", { attached: attached.length, total: docs.length })}</Badge>
      </div>
      <p style={s.hint}>{t("context.orderHint")}</p>

      <h3 style={s.section}>{t("context.attached")}</h3>
      {attached.length === 0 ? (
        <p style={s.none}>{t("context.noneAttached")}</p>
      ) : (
        <ol style={s.list} aria-label={t("context.attached")}>
          {attached.map((path, i) => {
            const doc = byPath.get(path);
            const missing = !doc && !noClone;
            const name = baseName(path);
            return (
              <li
                key={path}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  // Firefox does not start a drag without data on the transfer.
                  e.dataTransfer.setData("text/plain", path);
                  setDragFrom(i);
                }}
                onDragOver={(e) => {
                  if (dragFrom === null) return;
                  e.preventDefault();
                  setDragOver(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFrom !== null) move(dragFrom, i);
                  endDrag();
                }}
                onDragEnd={endDrag}
                style={s.row(dragOver === i && dragFrom !== i, dragFrom === i || missing)}
                data-missing={missing || undefined}
              >
                <span style={s.handle} title={t("context.drag")} aria-hidden>
                  <Icon.Menu size={14} />
                </span>
                <span className="mono" style={s.order}>
                  {i + 1}
                </span>
                <Checkbox checked onChange={() => save(attached.filter((p) => p !== path))} label={<span className="mono" style={s.name}>{name}</span>} />
                <span className="mono" style={s.dir}>
                  {dirOf(path)}
                </span>
                {doc && <FolderChip folder={doc.folder} />}
                {missing && (
                  <span title={t("context.missingHint")}>
                    <Badge color="var(--warn)" bg="var(--warn-bg)">
                      {t("context.missing", { repo: repoName })}
                    </Badge>
                  </span>
                )}
                {doc && (
                  <span className="mono tnum" style={s.tokens}>
                    {formatTokens(doc.tokens)}
                  </span>
                )}
                <div style={s.actions}>
                  {doc && <IconBtn icon="Eye" size={26} label={t("context.preview", { name })} onClick={() => setPreview(doc)} />}
                  {i > 0 && <IconBtn icon="ArrowUp" size={26} label={t("context.moveUp", { name })} onClick={() => move(i, i - 1)} />}
                  {i < attached.length - 1 && <IconBtn icon="ArrowDown" size={26} label={t("context.moveDown", { name })} onClick={() => move(i, i + 1)} />}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <h3 style={s.section}>{t("context.available", { repo: repoName })}</h3>
      {noClone ? (
        <p style={s.none}>{t("context.noClone", { repo: repoName })}</p>
      ) : docs.length === 0 ? (
        <p style={s.none}>{t("context.noDocs", { repo: repoName })}</p>
      ) : (
        <>
          <div style={s.filter}>
            <TextInput value={query} onChange={setQuery} placeholder={t("context.filterPlaceholder")} />
          </div>
          <ul style={s.list} aria-label={t("context.available", { repo: repoName })}>
            {available.map((doc) => (
              <li key={doc.path} style={s.row(false, false)}>
                <Checkbox checked={false} onChange={() => save([...attached, doc.path])} label={<span className="mono" style={s.name}>{doc.name}</span>} />
                <span className="mono" style={s.dir}>
                  {dirOf(doc.path)}
                </span>
                <FolderChip folder={doc.folder} />
                <span className="mono tnum" style={s.tokens}>
                  {formatTokens(doc.tokens)}
                </span>
                <div style={s.actions}>
                  <IconBtn icon="Eye" size={26} label={t("context.preview", { name: doc.name })} onClick={() => setPreview(doc)} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div style={s.footer}>
        <span className="mono" style={s.total(overCap)} data-testid="context-tokens">
          {t("context.tokens", { tokens: formatTokens(tokens) })}
        </span>
        {overCap && (
          <Badge color="var(--crit)" bg="var(--crit-bg)" icon="AlertTriangle">
            {t("context.overCap", { cap: formatTokens(CONTEXT_SOFT_CAP_TOKENS) })}
          </Badge>
        )}
        <span style={s.footerNote}>{t("context.footer")}</span>
      </div>
    </div>
  );
}
