import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BlastRadius } from "@devdigest/shared";
import { ApiError } from "../api.js";
import { findPull, findRepo } from "../resolve.js";
import type { ToolContext } from "./context.js";
import { fail, guarded, ok } from "./result.js";

/** Enough to see the reach; the full list is in DevDigest's Overview tab. */
const CALLERS_SHOWN = 10;

export function registerGetBlastRadius(server: McpServer, ctx: ToolContext) {
  server.registerTool(
    "get_blast_radius",
    {
      title: "Get a pull request's blast radius",
      description:
        "What a pull request can break: the symbols it changes, the code that calls them, and the " +
        "affected endpoints. Read from DevDigest's repository index — no LLM call, fast.",
      inputSchema: {
        repo: z.string().describe("Repository as owner/name."),
        pr: z.number().int().positive().describe("Pull request number."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ repo, pr }) =>
      guarded(async () => {
        const pull = await findPull(ctx.api, await findRepo(ctx.api, repo), pr);
        try {
          const blast = await ctx.api.get<BlastRadius>(`/pulls/${pull.id}/blast-radius`);
          if (blast.degraded) return fail(blast.degraded.message);
          return ok({
            summary: blast.summary,
            downstream: blast.downstream.map((d) => ({
              symbol: d.symbol,
              file: blast.changed_symbols.find((c) => c.name === d.symbol)?.file,
              callers: d.callers.slice(0, CALLERS_SHOWN).map((c) => `${c.file}:${c.line} (${c.name})`),
              ...(d.callers.length > CALLERS_SHOWN ? { more_callers: d.callers.length - CALLERS_SHOWN } : {}),
              endpoints: d.endpoints_affected,
              crons: d.crons_affected,
            })),
          });
        } catch (err) {
          if (err instanceof ApiError && err.code === "route_not_found") {
            return fail("This DevDigest server has no blast-radius endpoint yet. Review the diff without it.");
          }
          throw err;
        }
      }),
  );
}
