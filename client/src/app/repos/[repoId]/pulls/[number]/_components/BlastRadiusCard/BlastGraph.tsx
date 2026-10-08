"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@devdigest/ui";
import type { BlastRadius } from "@devdigest/shared";
import { columnY, shorten } from "./helpers";
import { s } from "./styles";

const W = 640;
const H = 240;
const X = { root: 80, callers: 330, endpoints: 545 };

/** Node-link view of one changed symbol: symbol → callers → endpoints. */
export function BlastGraph({ blast }: { blast: BlastRadius }) {
  const t = useTranslations("blast");
  const [pick, setPick] = React.useState(0);
  const d = blast.downstream[pick];
  if (!d) return <div style={s.muted}>{t("graph.empty")}</div>;

  const callers = d.callers.slice(0, 8).map((c, i, all) => ({ ...c, x: X.callers, y: columnY(i, all.length, H) }));
  const endpoints = d.endpoints_affected.slice(0, 5).map((e, i, all) => ({ label: e, x: X.endpoints, y: columnY(i, all.length, H) }));
  const root = { x: X.root, y: H / 2 };
  const curve = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    `M${a.x},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}`;
  // Endpoints hang off the callers, or off the symbol itself when it has none.
  const sources = callers.length > 0 ? callers : [root];

  return (
    <div>
      {blast.downstream.length > 1 && (
        <div style={s.picker}>
          {t("pickSymbol")}
          {blast.downstream.map((x, i) => (
            <Button key={`${x.symbol}:${i}`} kind="tertiary" size="sm" active={i === pick} aria-pressed={i === pick} onClick={() => setPick(i)}>
              <span className="mono">{x.symbol}()</span>
            </Button>
          ))}
        </div>
      )}
      <div style={s.graphWrap}>
        <svg width={W} height={H} role="img" aria-label={t("graph.ariaLabel")} style={{ display: "block" }}>
          {callers.map((c) => (
            <path key={`e-${c.file}:${c.line}`} d={curve({ x: root.x + 55, y: root.y }, { x: c.x - 70, y: c.y })} fill="none" stroke="var(--border-strong)" strokeWidth={1.5} />
          ))}
          {sources.flatMap((src) =>
            endpoints.map((e) => (
              <path
                key={`p-${src.x}:${src.y}-${e.label}`}
                d={curve({ x: src.x + (src === root ? 55 : 70), y: src.y }, { x: e.x - 80, y: e.y })}
                fill="none"
                stroke="var(--border)"
                strokeWidth={1.25}
              />
            )),
          )}
          <Node x={root.x} y={root.y} w={110} label={`${d.symbol}()`} stroke="var(--accent)" />
          {callers.map((c) => (
            <Node key={`n-${c.file}:${c.line}`} x={c.x} y={c.y} w={140} label={c.name} stroke="var(--border-strong)" title={`${c.file}:${c.line}`} />
          ))}
          {endpoints.map((e) => (
            <Node key={`ep-${e.label}`} x={e.x} y={e.y} w={160} label={e.label} stroke="var(--accent)" />
          ))}
        </svg>
      </div>
      <div style={s.legend}>
        <span>● {t("legend.changed")}</span>
        <span>● {t("legend.callers")}</span>
        <span>● {t("legend.endpoints")}</span>
      </div>
    </div>
  );
}

function Node({ x, y, w, label, stroke, title }: { x: number; y: number; w: number; label: string; stroke: string; title?: string }) {
  return (
    <g transform={`translate(${x - w / 2},${y - 13})`}>
      {title && <title>{title}</title>}
      <rect width={w} height={26} rx={6} fill="var(--bg-elevated)" stroke={stroke} strokeWidth={1.25} />
      <text x={w / 2} y={17} textAnchor="middle" fontSize={11} fontFamily="var(--font-mono)" fill="var(--text-primary)">
        {shorten(label, Math.floor(w / 7))}
      </text>
    </g>
  );
}
