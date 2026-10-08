import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiError } from "../api.js";
import { findPull, findRepo } from "../resolve.js";
import type { ToolContext } from "./context.js";
import { fail, guarded, ok } from "./result.js";

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
          return ok(await ctx.api.get<unknown>(`/pulls/${pull.id}/blast-radius`));
        } catch (err) {
          if (err instanceof ApiError && err.code === "route_not_found") {
            return fail("This DevDigest server has no blast-radius endpoint yet. Review the diff without it.");
          }
          throw err;
        }
      }),
  );
}
