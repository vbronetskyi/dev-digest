import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Agent } from "@devdigest/shared";
import type { ToolContext } from "./context.js";
import { guarded, ok } from "./result.js";

export function registerListAgents(server: McpServer, ctx: ToolContext) {
  server.registerTool(
    "list_agents",
    {
      title: "List DevDigest reviewer agents",
      description:
        "List the reviewer agents configured in DevDigest: id, name, what each one checks, model, and " +
        "whether it is enabled. Use it to pick the agent for run_agent_on_pr. No arguments.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () =>
      guarded(async () => {
        const agents = await ctx.api.get<Agent[]>("/agents");
        return ok({
          agents: agents.map((a) => ({
            id: a.id,
            name: a.name,
            checks: a.description,
            model: `${a.provider}/${a.model}`,
            enabled: a.enabled,
          })),
        });
      }),
  );
}
