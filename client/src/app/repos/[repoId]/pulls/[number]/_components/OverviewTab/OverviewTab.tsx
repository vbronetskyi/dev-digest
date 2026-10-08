"use client";

import React from "react";
import { SectionLabel } from "@devdigest/ui";
import { BlastRadiusCard } from "../BlastRadiusCard";
import { IntentCard } from "../IntentCard";
import { s } from "./styles";

interface OverviewTabProps {
  prBody: string | null | undefined;
  prId: string;
  repo: string | null;
  defaultBranch: string;
  headSha: string | null | undefined;
}

export function OverviewTab({ prBody, prId, repo, defaultBranch, headSha }: OverviewTabProps) {
  return (
    <>
      {prBody && (
        <section>
          <SectionLabel icon="MessageSquare">Description</SectionLabel>
          <div style={s.descriptionBox}>{prBody}</div>
        </section>
      )}
      <IntentCard prId={prId} headSha={headSha} />
      {repo && <BlastRadiusCard prId={prId} repo={repo} defaultBranch={defaultBranch} />}
    </>
  );
}
