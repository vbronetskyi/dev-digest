import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RunResult, RunSummary } from "@devdigest/shared";
import { compactRun } from "../format.js";
import { findAgent, findPull, findRepo, ToolError } from "../resolve.js";
import type { ToolContext } from "./context.js";
import { guarded, ok } from "./result.js";

export function registerGetFindings(server: McpServer, ctx: ToolContext) {
  server.registerTool(
    "get_findings",
    {
      title: "Read a finished DevDigest review",
      description:
        "Read the verdict and findings of a review that already ran, without starting a new one. Pass " +
        "run_id (returned by run_agent_on_pr), or repo + pr to get the latest finished run on that pull " +
        "request, optionally narrowed to one agent.",
      inputSchema: {
        run_id: z.string().optional().describe("Run id from run_agent_on_pr."),
        repo: z.string().optional().describe("Repository as owner/name, when there is no run_id."),
        pr: z.number().int().positive().optional().describe("Pull request number, with repo."),
        agent: z.string().optional().describe("Only this agent's latest run (id or name)."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ run_id, repo, pr, agent }) =>
      guarded(async () => {
        if (run_id) return ok(compactRun(await ctx.api.get<RunResult>(`/runs/${run_id}/review`)));
        if (!repo || pr === undefined) throw new ToolError("Pass run_id, or both repo and pr.");

        const pull = await findPull(ctx.api, await findRepo(ctx.api, repo), pr);
        const agentId = agent ? (await findAgent(ctx.api, agent)).id : undefined;
        const runs = await ctx.api.get<RunSummary[]>(`/pulls/${pull.id}/runs`);
        // Newest first from the API.
        const latest = runs.find((r) => r.status === "done" && (!agentId || r.agent_id === agentId));
        if (!latest) {
          throw new ToolError(
            `No finished review on ${repo}#${pr}${agent ? ` by ${agent}` : ""}. Start one with run_agent_on_pr.`,
          );
        }
        return ok(compactRun(await ctx.api.get<RunResult>(`/runs/${latest.run_id}/review`)));
      }),
  );
}
