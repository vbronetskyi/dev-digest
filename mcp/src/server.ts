import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DevDigestApi } from "./api.js";
import type { ToolContext } from "./tools/context.js";
import { registerGetBlastRadius } from "./tools/get-blast-radius.js";
import { registerGetConventions } from "./tools/get-conventions.js";
import { registerGetFindings } from "./tools/get-findings.js";
import { registerListAgents } from "./tools/list-agents.js";
import { registerRunAgentOnPr } from "./tools/run-agent-on-pr.js";

export const SERVER_NAME = "devdigest";

/**
 * Five tools that only DevDigest can answer. No list_repos / list_prs: `gh pr
 * list` already does that, and one tool per endpoint only bloats the context.
 */
export function createServer(overrides: Partial<ToolContext> = {}): McpServer {
  const ctx: ToolContext = {
    api: new DevDigestApi(),
    pollMs: 3_000,
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    now: () => Date.now(),
    ...overrides,
  };
  const server = new McpServer(
    { name: SERVER_NAME, version: "0.1.0" },
    {
      // With tool search on, only tool names and these instructions are in context
      // up front, so they say when to reach for the tools.
      instructions:
        "DevDigest reviews pull requests with configured reviewer agents and grounds every finding in a " +
        "real diff line. Use these tools when asked to review a PR with DevDigest or one of its agents, to " +
        "read a review's findings, to follow a repository's house conventions, or to see what a PR can " +
        "break. Flow: list_agents → run_agent_on_pr → cite the findings; get_findings re-reads a finished " +
        "run without paying for a new one.",
    },
  );
  registerListAgents(server, ctx);
  registerRunAgentOnPr(server, ctx);
  registerGetFindings(server, ctx);
  registerGetConventions(server, ctx);
  registerGetBlastRadius(server, ctx);
  return server;
}
