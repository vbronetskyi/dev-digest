/** Map the names an agent uses ("acme/api", PR 3, "security-reviewer") to DevDigest ids. */
import type { Agent, PrMeta, Repo } from "@devdigest/shared";
import type { DevDigestApi } from "./api.js";

/** A failure the model can act on: the message says what to do next. */
export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function findRepo(api: DevDigestApi, repo: string): Promise<Repo> {
  const repos = await api.get<Repo[]>("/repos");
  const want = repo.trim().toLowerCase().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
  const exact = repos.find((r) => r.full_name.toLowerCase() === want || r.id === repo);
  if (exact) return exact;
  const byName = repos.filter((r) => r.name.toLowerCase() === want);
  if (byName.length === 1) return byName[0]!;
  const known = repos.map((r) => r.full_name).join(", ") || "none";
  throw new ToolError(`Repository "${repo}" is not in DevDigest. Repositories it knows: ${known}. Pass one as owner/name.`);
}

export async function findPull(api: DevDigestApi, repo: Repo, number: number): Promise<PrMeta & { id: string }> {
  const pulls = await api.get<(PrMeta & { id: string })[]>(`/repos/${repo.id}/pulls`);
  const pr = pulls.find((p) => p.number === number);
  if (pr) return pr;
  const known = pulls.map((p) => `#${p.number}`).slice(0, 20).join(", ") || "none";
  throw new ToolError(`PR #${number} is not in DevDigest for ${repo.full_name} (it has: ${known}). Check the number with gh pr list.`);
}

/**
 * Resolve an agent by id, by name ("Security Reviewer", "security-reviewer"), or by
 * an unambiguous prefix ("security").
 */
export async function findAgent(api: DevDigestApi, agent: string): Promise<Agent> {
  const agents = await api.get<Agent[]>("/agents");
  const want = slug(agent);
  const match =
    agents.find((a) => a.id === agent) ??
    agents.find((a) => slug(a.name) === want) ??
    single(agents.filter((a) => slug(a.name).startsWith(want) && a.enabled));
  if (match) return match;
  throw new ToolError(`No agent matches "${agent}". Call list_agents and pass an id or an exact name.`);
}

function single<T>(xs: T[]): T | undefined {
  return xs.length === 1 ? xs[0] : undefined;
}
