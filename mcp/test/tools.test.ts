import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { DevDigestApi } from "../src/api.js";
import { createServer } from "../src/server.js";
import { fakeApi } from "./fake-api.js";

const REPO = { id: "r1", full_name: "acme/payments-api", name: "payments-api", owner: "acme" };
const PULLS = [{ id: "p3", number: 3, title: "share webhook" }, { id: "p1", number: 1, title: "summary" }];
const AGENTS = [
  { id: "a1", name: "General Reviewer", description: "bugs", provider: "openrouter", model: "deepseek/deepseek-v4-flash", enabled: true },
  { id: "a2", name: "Security Reviewer", description: "secrets, SSRF", provider: "openrouter", model: "deepseek/deepseek-v4-flash", enabled: true },
];
const FINDING = (severity: string, title: string, line: number) => ({
  id: title, review_id: "rv", severity, category: "security", title, file: "src/routes.ts", start_line: line, end_line: line,
  rationale: "x".repeat(600), suggestion: "Validate the URL.", confidence: 0.9, accepted_at: null, dismissed_at: null,
});
const runResult = (status: string) => ({
  run: { run_id: "run1", agent_id: "a2", agent_name: "Security Reviewer", status, score: status === "done" ? 47 : null, blockers: 1, cost_usd: 0.0004, error: status === "failed" ? "the PR has no changed files with a patch — nothing to review" : null },
  pr_id: "p3",
  pr_number: 3,
  repo: "acme/payments-api",
  review: status === "done"
    ? { verdict: "request_changes", summary: "SSRF in webhook.", findings: [FINDING("SUGGESTION", "Log", 40), FINDING("CRITICAL", "SSRF via callback_url", 12)] }
    : null,
});

async function connect(api: DevDigestApi, clock = { t: 0 }) {
  const server = createServer({ api, pollMs: 1000, sleep: async (ms) => void (clock.t += ms), now: () => clock.t });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(b);
  return client;
}

const text = (r: unknown) => ((r as { content: { text: string }[] }).content[0]!.text);
const json = (r: unknown) => JSON.parse(text(r));

describe("devdigest-mcp tools", () => {
  it("exposes exactly the five DevDigest tools, each described and annotated", async () => {
    const client = await connect(fakeApi({}).api);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["get_blast_radius", "get_conventions", "get_findings", "list_agents", "run_agent_on_pr"]);
    for (const t of tools) {
      expect(t.description!.length).toBeGreaterThan(60);
      expect(t.annotations?.readOnlyHint).toBe(t.name !== "run_agent_on_pr");
    }
    // Flat, primitive arguments only.
    const run = tools.find((t) => t.name === "run_agent_on_pr")!;
    expect(Object.values(run.inputSchema.properties as Record<string, { type: string }>).map((p) => p.type)).toEqual(["string", "integer", "string", "integer"]);
  });

  it("list_agents returns a compact list", async () => {
    const client = await connect(fakeApi({ "GET /agents": AGENTS }).api);
    expect(json(await client.callTool({ name: "list_agents", arguments: {} })).agents[1]).toEqual({
      id: "a2", name: "Security Reviewer", checks: "secrets, SSRF", model: "openrouter/deepseek/deepseek-v4-flash", enabled: true,
    });
  });

  it("run_agent_on_pr resolves names, starts the run, waits, and returns findings most severe first", async () => {
    let polls = 0;
    const { api, calls } = fakeApi({
      "GET /repos": [REPO],
      "GET /repos/r1/pulls": PULLS,
      "GET /agents": AGENTS,
      "POST /pulls/p3/review": (body: unknown) => {
        expect(body).toEqual({ agentId: "a2" });
        return { json: { runs: [{ run_id: "run1" }] } };
      },
      "GET /runs/run1/review": () => ({ json: runResult(++polls < 3 ? "running" : "done") }),
    });
    const client = await connect(api);
    const res = await client.callTool({ name: "run_agent_on_pr", arguments: { repo: "acme/payments-api", pr: 3, agent: "security-reviewer" } });
    expect(res.isError).toBeFalsy();
    const out = json(res);
    expect(out).toMatchObject({ run_id: "run1", pr: "acme/payments-api#3", status: "done", verdict: "request_changes", score: 47, counts: { CRITICAL: 1, WARNING: 0, SUGGESTION: 1 } });
    expect(out.findings.map((f: { title: string }) => f.title)).toEqual(["SSRF via callback_url", "Log"]);
    expect(out.findings[0].where).toBe("src/routes.ts:12");
    expect(out.findings[0].why.length).toBeLessThanOrEqual(400);
    expect(calls.filter((c) => c === "GET /runs/run1/review")).toHaveLength(3);
  });

  it("sends progress while waiting when the client asks for it", async () => {
    let polls = 0;
    const { api } = fakeApi({
      "GET /repos": [REPO], "GET /repos/r1/pulls": PULLS, "GET /agents": AGENTS,
      "POST /pulls/p3/review": { runs: [{ run_id: "run1" }] },
      "GET /runs/run1/review": () => ({ json: runResult(++polls < 3 ? "running" : "done") }),
    });
    const progress: { progress: number; message?: string | undefined }[] = [];
    const client = await connect(api);
    await client.callTool(
      { name: "run_agent_on_pr", arguments: { repo: "acme/payments-api", pr: 3, agent: "security" } },
      undefined,
      { onprogress: (p) => void progress.push(p) },
    );
    expect(progress.map((p) => p.progress)).toEqual([0, 1]);
    expect(progress[0]!.message).toBe("Security Reviewer is reviewing acme/payments-api#3");
  });

  it("returns a still-running run with what to do next instead of hanging", async () => {
    const { api } = fakeApi({
      "GET /repos": [REPO], "GET /repos/r1/pulls": PULLS, "GET /agents": AGENTS,
      "POST /pulls/p3/review": { runs: [{ run_id: "run1" }] },
      "GET /runs/run1/review": runResult("running"),
    });
    const out = json(await (await connect(api)).callTool({ name: "run_agent_on_pr", arguments: { repo: "payments-api", pr: 3, agent: "security", wait_seconds: 10 } }));
    expect(out).toMatchObject({ run_id: "run1", status: "running" });
    expect(out.next).toMatch(/get_findings/);
  });

  it("a failed run is an error result that carries the reason", async () => {
    const { api } = fakeApi({
      "GET /repos": [REPO], "GET /repos/r1/pulls": PULLS, "GET /agents": AGENTS,
      "POST /pulls/p3/review": { runs: [{ run_id: "run1" }] },
      "GET /runs/run1/review": runResult("failed"),
    });
    const res = await (await connect(api)).callTool({ name: "run_agent_on_pr", arguments: { repo: "acme/payments-api", pr: 3, agent: "a2" } });
    expect(res.isError).toBe(true);
    expect(json(res).error).toMatch(/nothing to review/);
  });

  it("errors tell the model what to do next", async () => {
    const client = await connect(fakeApi({ "GET /repos": [REPO], "GET /repos/r1/pulls": PULLS, "GET /agents": AGENTS }).api);
    const call = (args: Record<string, unknown>) => client.callTool({ name: "run_agent_on_pr", arguments: args });
    expect(text(await call({ repo: "acme/other", pr: 3, agent: "security" }))).toMatch(/knows: acme\/payments-api/);
    expect(text(await call({ repo: "acme/payments-api", pr: 9, agent: "security" }))).toMatch(/it has: #3, #1/);
    const unknown = await call({ repo: "acme/payments-api", pr: 3, agent: "perf" });
    expect(unknown.isError).toBe(true);
    expect(text(unknown)).toMatch(/Call list_agents/);
    // "reviewer" is a prefix of nothing; "general" and "security" both end in reviewer — no guessing
    expect(text(await call({ repo: "acme/payments-api", pr: 3, agent: "reviewer" }))).toMatch(/No agent matches/);
  });

  it("get_findings picks the newest finished run of the requested agent", async () => {
    const { api, calls } = fakeApi({
      "GET /repos": [REPO], "GET /repos/r1/pulls": PULLS, "GET /agents": AGENTS,
      "GET /pulls/p3/runs": [
        { run_id: "run9", agent_id: "a2", status: "running" },
        { run_id: "run1", agent_id: "a2", status: "done" },
        { run_id: "run0", agent_id: "a1", status: "done" },
      ],
      "GET /runs/run1/review": runResult("done"),
    });
    const out = json(await (await connect(api)).callTool({ name: "get_findings", arguments: { repo: "acme/payments-api", pr: 3, agent: "Security Reviewer" } }));
    expect(out.run_id).toBe("run1");
    expect(calls).not.toContain("POST /pulls/p3/review");
  });

  it("get_conventions returns accepted rules unless asked for pending ones", async () => {
    const conventions = [
      { id: "c1", rule: "Scope queries by workspace", evidence_path: "server/a.ts:3", evidence_snippet: "…", confidence: 0.8, accepted: true },
      { id: "c2", rule: "Use kebab-case files", evidence_path: "server/b.ts:1", evidence_snippet: "…", confidence: 0.6, accepted: false },
    ];
    const client = await connect(fakeApi({ "GET /repos": [REPO], "GET /repos/r1/conventions": conventions }).api);
    const accepted = json(await client.callTool({ name: "get_conventions", arguments: { repo: "acme/payments-api" } }));
    expect(accepted.conventions).toEqual([{ rule: "Scope queries by workspace", evidence: "server/a.ts:3", confidence: 0.8 }]);
    const all = json(await client.callTool({ name: "get_conventions", arguments: { repo: "acme/payments-api", include_pending: true } }));
    expect(all.conventions).toHaveLength(2);
  });

  it("get_blast_radius says plainly when the server cannot answer yet", async () => {
    const client = await connect(fakeApi({ "GET /repos": [REPO], "GET /repos/r1/pulls": PULLS }).api);
    const res = await client.callTool({ name: "get_blast_radius", arguments: { repo: "acme/payments-api", pr: 3 } });
    expect(res.isError).toBe(true);
    expect(text(res)).toMatch(/no blast-radius endpoint yet/);
  });

  it("get_blast_radius returns a compact map, and the server's reason when it has none", async () => {
    const blast = {
      changed_symbols: [{ name: "rateLimit", file: "src/ratelimit.ts", kind: "function" }],
      downstream: [{ symbol: "rateLimit", callers: Array.from({ length: 12 }, (_, i) => ({ name: `c${i}`, file: `src/c${i}.ts`, line: i + 1 })), endpoints_affected: ["GET /items"], crons_affected: [] }],
      summary: "1 symbol changed → 12 callers, 1 endpoint",
    };
    const client = await connect(fakeApi({ "GET /repos": [REPO], "GET /repos/r1/pulls": PULLS, "GET /pulls/p3/blast-radius": blast, "GET /pulls/p1/blast-radius": { ...blast, downstream: [], degraded: { reason: "not_indexed", message: "Not indexed yet." } } }).api);
    const out = json(await client.callTool({ name: "get_blast_radius", arguments: { repo: "acme/payments-api", pr: 3 } }));
    expect(out.downstream[0]).toMatchObject({ symbol: "rateLimit", file: "src/ratelimit.ts", endpoints: ["GET /items"], more_callers: 2 });
    expect(out.downstream[0].callers).toHaveLength(10);
    expect(out.downstream[0].callers[0]).toBe("src/c0.ts:1 (c0)");
    const degraded = await client.callTool({ name: "get_blast_radius", arguments: { repo: "acme/payments-api", pr: 1 } });
    expect(degraded.isError).toBe(true);
    expect(text(degraded)).toBe("Not indexed yet.");
  });

  it("an unreachable API is reported with how to start it", async () => {
    const down = new DevDigestApi("http://127.0.0.1:9", (async () => { throw new TypeError("fetch failed"); }) as typeof fetch);
    const res = await (await connect(down)).callTool({ name: "list_agents", arguments: {} });
    expect(res.isError).toBe(true);
    expect(text(res)).toMatch(/not reachable at http:\/\/127\.0\.0\.1:9.*dev\.sh/);
  });
});
