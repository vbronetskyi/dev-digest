import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ContextDoc, ContextDocList } from "@devdigest/shared";
import agents from "../../../../../../../../messages/en/agents.json";
import context from "../../../../../../../../messages/en/context.json";

const h = vi.hoisted(() => ({
  list: { docs: [], reason: null } as ContextDocList,
  paths: [] as string[],
  mutate: vi.fn(),
}));
vi.mock("@/lib/hooks/context", () => ({
  useContextDocs: () => ({ data: h.list, isLoading: false, isError: false }),
  useAgentContext: () => ({ data: { paths: h.paths }, isLoading: false }),
  useSetAgentContext: () => ({ mutate: h.mutate }),
  useContextDoc: () => ({ data: { path: "x", folder: "specs", body: "# Doc" }, isLoading: false, isError: false }),
}));
vi.mock("@/lib/repo-context", () => ({
  useActiveRepo: () => ({ repoId: "r1", activeRepo: { full_name: "acme/api" } }),
}));

import { ContextTab } from "./ContextTab";

afterEach(() => {
  cleanup();
  h.mutate.mockReset();
});

const doc = (path: string, folder: ContextDoc["folder"], tokens: number): ContextDoc => ({
  path,
  folder,
  name: path.slice(path.lastIndexOf("/") + 1),
  bytes: tokens * 4,
  tokens,
  used_by: 1,
});
const DOCS = [doc("specs/public-api.md", "specs", 900), doc("specs/security.md", "specs", 1200), doc("docs/architecture.md", "docs", 500)];

const renderTab = () =>
  render(
    <NextIntlClientProvider locale="en" messages={{ agents, context }}>
      <ContextTab agentId="a1" />
    </NextIntlClientProvider>,
  );

// SPEC-01 AC-20 – AC-22.
describe("ContextTab", () => {
  it("AC-20: lists attached documents in order and the rest as available; ticking attaches, unticking detaches", () => {
    h.list = { docs: DOCS, reason: null };
    h.paths = ["docs/architecture.md", "specs/public-api.md"];
    renderTab();
    const attached = screen.getByRole("list", { name: "Attached" });
    expect(within(attached).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      expect.stringContaining("architecture.md"),
      expect.stringContaining("public-api.md"),
    ]);
    const available = screen.getByRole("list", { name: "Available in acme/api" });
    expect(within(available).getAllByRole("listitem")).toHaveLength(1);

    fireEvent.click(within(available).getByRole("checkbox"));
    expect(h.mutate).toHaveBeenLastCalledWith(["docs/architecture.md", "specs/public-api.md", "specs/security.md"], expect.anything());
    fireEvent.click(within(attached).getAllByRole("checkbox")[0]!);
    expect(h.mutate).toHaveBeenLastCalledWith(["specs/public-api.md"], expect.anything());
  });

  it("AC-20: reorders with the arrow buttons", () => {
    h.list = { docs: DOCS, reason: null };
    h.paths = ["docs/architecture.md", "specs/public-api.md"];
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: "Move architecture.md down" }));
    expect(h.mutate).toHaveBeenLastCalledWith(["specs/public-api.md", "docs/architecture.md"], expect.anything());
  });

  it("AC-21: shows the attached token total and warns above the 4K soft cap", () => {
    h.list = { docs: [...DOCS, doc("docs/huge.md", "docs", 3000)], reason: null };
    h.paths = ["docs/architecture.md"];
    renderTab();
    expect(screen.getByTestId("context-tokens").textContent).toBe("≈ 500 tokens attached");
    expect(screen.queryByText(/soft cap/)).toBeNull();
    cleanup();

    h.paths = ["specs/security.md", "docs/huge.md"];
    renderTab();
    expect(screen.getByTestId("context-tokens").textContent).toBe("≈ 4.2K tokens attached");
    expect(screen.getByText("over the 4K soft cap")).toBeTruthy();
  });

  it("AC-22: marks an attached path the active repository does not have, and still lets it be removed", () => {
    h.list = { docs: DOCS, reason: null };
    h.paths = ["specs/gone.md", "specs/public-api.md"];
    renderTab();
    const row = screen.getByText("gone.md").closest("li")!;
    expect(row.getAttribute("data-missing")).toBe("true");
    expect(within(row).getByText("not in acme/api")).toBeTruthy();
    fireEvent.click(within(row).getByRole("checkbox"));
    expect(h.mutate).toHaveBeenLastCalledWith(["specs/public-api.md"], expect.anything());
  });

  it("says when the repository is not cloned, without calling attached paths missing", () => {
    h.list = { docs: [], reason: "no_clone" };
    h.paths = ["specs/public-api.md"];
    renderTab();
    expect(screen.getByText(/acme\/api is not cloned yet/)).toBeTruthy();
    expect(screen.queryByText("not in acme/api")).toBeNull();
  });
});
