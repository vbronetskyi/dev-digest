import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { AgentSkillLink, SkillListItem } from "@devdigest/shared";
import agents from "../../../../../../../../messages/en/agents.json";
import skills from "../../../../../../../../messages/en/skills.json";

const h = vi.hoisted(() => ({
  mutate: vi.fn(),
  push: vi.fn(),
  library: [] as SkillListItem[],
  links: [] as AgentSkillLink[],
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, replace: vi.fn() }) }));
vi.mock("@/lib/hooks/skills", () => ({
  useSkills: () => ({ data: h.library, isLoading: false }),
  useAgentSkills: () => ({ data: h.links, isLoading: false }),
  useSetAgentSkills: () => ({ mutate: h.mutate }),
}));

import { SkillsTab } from "./SkillsTab";

function skill(id: string, name: string, extra: Partial<SkillListItem> = {}): SkillListItem {
  return {
    id,
    name,
    description: `${name} description`,
    type: "convention",
    source: "manual",
    body: "body",
    enabled: true,
    version: 1,
    linked_agents: 0,
    ...extra,
  };
}

function renderTab() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ agents, skills }}>
      <SkillsTab agentId="ag1" />
    </NextIntlClientProvider>,
  );
}

const linkedNames = () =>
  within(screen.getByRole("list", { name: "Linked" }))
    .getAllByRole("checkbox")
    .map((cb) => cb.closest("label")!.textContent);

beforeEach(() => {
  h.mutate.mockReset();
  h.library = [
    skill("s1", "query-efficiency", { type: "rubric" }),
    skill("s2", "null-not-zero"),
    skill("s3", "ssrf-outbound-requests", { type: "security", enabled: false }),
  ];
  // Linked in the opposite order to the library: the tab must follow link order.
  h.links = [
    { agent_id: "ag1", skill_id: "s3", order: 0 },
    { agent_id: "ag1", skill_id: "s1", order: 1 },
  ];
});
afterEach(cleanup);

describe("Agent Skills tab", () => {
  it("lists linked skills in prompt order and the rest as available", () => {
    renderTab();
    expect(linkedNames()).toEqual(["ssrf-outbound-requests", "query-efficiency"]);
    const available = screen.getByRole("list", { name: "Available" });
    expect(available).toHaveTextContent("null-not-zero");
    expect(available).not.toHaveTextContent("query-efficiency");
    expect(screen.getByText("2 of 3 enabled")).toBeInTheDocument();
  });

  it("flags a linked skill that is disabled in the library", () => {
    renderTab();
    const row = screen.getByRole("checkbox", { name: /ssrf-outbound-requests/ }).closest("li")!;
    expect(row).toHaveTextContent("disabled");
    expect(within(row).getByTitle(/will not reach the prompt/)).toHaveTextContent("disabled");
  });

  it("reorders with the arrow buttons", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: "Move query-efficiency up" }));
    expect(h.mutate).toHaveBeenCalledWith(["s1", "s3"], expect.anything());
    // The ends of the list have no button that would be a no-op.
    expect(screen.queryByRole("button", { name: "Move ssrf-outbound-requests up" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Move query-efficiency down" })).toBeNull();
  });

  it("reorders by drag and drop", () => {
    renderTab();
    const rows = screen.getByRole("list", { name: "Linked" }).querySelectorAll("li");
    const dataTransfer = { setData: vi.fn(), effectAllowed: "" };
    fireEvent.dragStart(rows[1]!, { dataTransfer });
    fireEvent.dragOver(rows[0]!, { dataTransfer });
    fireEvent.drop(rows[0]!, { dataTransfer });
    expect(h.mutate).toHaveBeenCalledWith(["s1", "s3"], expect.anything());
  });

  it("links a skill at the end and unlinks by unticking", () => {
    renderTab();
    fireEvent.click(screen.getByRole("checkbox", { name: /null-not-zero/ }));
    expect(h.mutate).toHaveBeenLastCalledWith(["s3", "s1", "s2"], expect.anything());
    fireEvent.click(screen.getByRole("checkbox", { name: /ssrf-outbound-requests/ }));
    expect(h.mutate).toHaveBeenLastCalledWith(["s1"], expect.anything());
  });

  it("filters only the available list", () => {
    h.library.push(skill("s4", "fastify-route-contracts"));
    renderTab();
    fireEvent.change(screen.getByPlaceholderText("Filter skills…"), { target: { value: "fastify" } });
    const available = screen.getByRole("list", { name: "Available" });
    expect(available).toHaveTextContent("fastify-route-contracts");
    expect(available).not.toHaveTextContent("null-not-zero");
    expect(linkedNames()).toHaveLength(2);
  });

  it("points to the Skills Lab when the library is empty", () => {
    h.library = [];
    h.links = [];
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: "Open Skills Lab" }));
    expect(h.push).toHaveBeenCalledWith("/skills");
  });
});
