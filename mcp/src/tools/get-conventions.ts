import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ConventionCandidate } from "@devdigest/shared";
import { findRepo } from "../resolve.js";
import type { ToolContext } from "./context.js";
import { guarded, ok } from "./result.js";

export function registerGetConventions(server: McpServer, ctx: ToolContext) {
  server.registerTool(
    "get_conventions",
    {
      title: "Get a repository's house conventions",
      description:
        "House rules of a repository that DevDigest extracted from its own code, each with the file and " +
        "lines that show it. By default only the rules a maintainer accepted; include_pending adds the " +
        "unreviewed candidates. Use them to write or review code the way this repository does.",
      inputSchema: {
        repo: z.string().describe("Repository as owner/name."),
        include_pending: z.boolean().optional().describe("Also return candidates nobody has accepted yet."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ repo, include_pending }) =>
      guarded(async () => {
        const repoRow = await findRepo(ctx.api, repo);
        const all = await ctx.api.get<ConventionCandidate[]>(`/repos/${repoRow.id}/conventions`);
        const shown = include_pending ? all : all.filter((c) => c.accepted);
        return ok({
          repo: repoRow.full_name,
          conventions: shown.map((c) => ({
            rule: c.rule,
            evidence: c.evidence_path,
            confidence: c.confidence,
            ...(include_pending ? { accepted: c.accepted } : {}),
          })),
          ...(shown.length === 0
            ? {
                note:
                  all.length > 0
                    ? `No accepted conventions yet; ${all.length} candidate(s) await review in DevDigest → Conventions.`
                    : "No conventions extracted yet: run the extraction in DevDigest → Conventions.",
              }
            : {}),
        });
      }),
  );
}
