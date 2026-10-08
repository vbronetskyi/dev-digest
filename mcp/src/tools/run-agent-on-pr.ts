import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RunResult } from "@devdigest/shared";
import { compactRun } from "../format.js";
import { findAgent, findPull, findRepo } from "../resolve.js";
import type { ToolContext } from "./context.js";
import { fail, guarded, ok } from "./result.js";

const DEFAULT_WAIT_SECONDS = 240;

export function registerRunAgentOnPr(server: McpServer, ctx: ToolContext) {
  server.registerTool(
    "run_agent_on_pr",
    {
      title: "Run a DevDigest review on a pull request",
      description:
        "Run one DevDigest reviewer agent on a pull request and wait for its verdict. Starts the review, " +
        "waits until it finishes, and returns verdict, score and grounded findings (severity, file:line, " +
        "why, fix), most severe first. Each call is a paid LLM review: to re-read a finished run use " +
        "get_findings instead of running again.",
      inputSchema: {
        repo: z.string().describe("Repository as owner/name, e.g. acme/payments-api."),
        pr: z.number().int().positive().describe("Pull request number."),
        agent: z.string().describe('Agent id or name from list_agents, e.g. "Security Reviewer" or "security".'),
        wait_seconds: z
          .number()
          .int()
          .min(10)
          .max(900)
          .optional()
          .describe(`How long to wait for the result before returning status "running". Default ${DEFAULT_WAIT_SECONDS}.`),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    ({ repo, pr, agent, wait_seconds }, extra) =>
      guarded(async () => {
        const repoRow = await findRepo(ctx.api, repo);
        const pull = await findPull(ctx.api, repoRow, pr);
        const agentRow = await findAgent(ctx.api, agent);
        const started = await ctx.api.post<{ runs: { run_id: string }[] }>(`/pulls/${pull.id}/review`, {
          agentId: agentRow.id,
        });
        const runId = started.runs[0]?.run_id;
        if (!runId) return fail("DevDigest did not start a run. Try again, or check the agent is valid with list_agents.");

        const started_at = ctx.now();
        const deadline = started_at + (wait_seconds ?? DEFAULT_WAIT_SECONDS) * 1000;
        // Clients that pass a progress token get a heartbeat while the model works.
        const progressToken = extra._meta?.progressToken;
        for (;;) {
          const result = await ctx.api.get<RunResult>(`/runs/${runId}/review`);
          if (result.run.status !== "running") {
            const compact = compactRun(result);
            return result.run.status === "done" ? ok(compact) : { ...ok(compact), isError: true };
          }
          if (ctx.now() >= deadline) {
            return ok({
              run_id: runId,
              status: "running",
              next: "The review is still running. Call get_findings with this run_id in a minute.",
            });
          }
          if (progressToken !== undefined) {
            await extra.sendNotification({
              method: "notifications/progress",
              params: {
                progressToken,
                progress: Math.round((ctx.now() - started_at) / 1000),
                message: `${agentRow.name} is reviewing ${repoRow.full_name}#${pr}`,
              },
            });
          }
          await ctx.sleep(ctx.pollMs);
        }
      }),
  );
}
