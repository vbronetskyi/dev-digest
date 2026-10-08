import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Onboarding } from "@devdigest/shared";
import onboarding from "../../../../../../../messages/en/onboarding.json";

// jsdom cannot run mermaid; the parse gate lives in MermaidDiagram itself.
vi.mock("@/components/mermaid-diagram", () => ({ MermaidDiagram: ({ chart }: { chart: string }) => <pre data-testid="diagram">{chart}</pre> }));

import { OnboardingTour } from "./OnboardingTour";

afterEach(cleanup);

const TOUR: Onboarding = {
  sections: [
    { kind: "architecture", title: "Architecture overview", body: "A **Fastify** API. <script>window.x = 1</script>", diagram: "flowchart LR\n  A --> B", links: [{ label: "@acme/api", path: "server/package.json" }] },
    { kind: "critical_paths", title: "Critical paths", body: "Chains.", diagram: null, links: [] },
    { kind: "how_to_run", title: "How to run locally", body: "- `pnpm dev`", diagram: null, links: [] },
    {
      kind: "reading_path",
      title: "Guided reading path",
      body: "Start here.",
      diagram: null,
      links: [
        { label: "DB client.", path: "server/src/db.ts" },
        { label: "App factory.", path: "server/src/app.ts" },
      ],
    },
    { kind: "first_tasks", title: "First tasks", body: "- Add a health route", diagram: null, links: [] },
  ],
  meta: { source: "model", reason: null, model: "deepseek/deepseek-v4-flash", cost_usd: 0.000493, generated_at: "2026-10-08T15:04:02Z", indexed_sha: "7c410c657c9b", files_total: 622 },
};

const renderTour = (props: Partial<React.ComponentProps<typeof OnboardingTour>> = {}) =>
  render(
    <NextIntlClientProvider locale="en" messages={{ onboarding }}>
      <OnboardingTour tour={TOUR} repoFullName="acme/api" generating={false} error={null} onGenerate={() => {}} {...props} />
    </NextIntlClientProvider>,
  );

// SPEC-02 AC-20 – AC-23.
describe("OnboardingTour", () => {
  it("AC-20: without a tour, offers Generate and calls it only on click", () => {
    const onGenerate = vi.fn();
    renderTour({ tour: null, onGenerate });
    expect(screen.getByText("Generate an onboarding tour")).toBeTruthy();
    expect(onGenerate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Generate onboarding tour" }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it("AC-21: shows the sections in order with an index, and links files on GitHub at the indexed commit", () => {
    renderTour();
    expect(screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"))).toEqual([
      "Architecture overview",
      "Critical paths",
      "How to run locally",
      "Guided reading path",
      "First tasks",
    ]);
    const index = screen.getByRole("navigation", { name: "On this page" });
    expect(within(index).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "#architecture",
      "#critical_paths",
      "#how_to_run",
      "#reading_path",
      "#first_tasks",
    ]);
    const reading = screen.getByRole("region", { name: "Guided reading path" });
    const steps = within(reading).getAllByRole("listitem");
    expect(steps.map((li) => li.textContent)).toEqual(["1server/src/db.tsDB client.", "2server/src/app.tsApp factory."]);
    expect(within(reading).getByRole("link", { name: "Open server/src/db.ts on GitHub" }).getAttribute("href")).toBe(
      "https://github.com/acme/api/blob/7c410c657c9b/server/src/db.ts",
    );
  });

  it("AC-22: the footer names the model, the cost and the indexed commit — or says it is a skeleton and why", () => {
    renderTour();
    expect(screen.getByTestId("tour-footer").textContent).toMatch(/^Written by deepseek\/deepseek-v4-flash from facts collected by code · \$0\.000493 · index 7c410c6 · /);
    cleanup();
    renderTour({ tour: { ...TOUR, meta: { ...TOUR.meta!, source: "skeleton", reason: "No API key for openrouter", model: null, cost_usd: null } } });
    expect(screen.getByTestId("tour-footer").textContent).toMatch(/^Skeleton built from the facts alone, no model \(No API key for openrouter\) · index 7c410c6/);
  });

  it("AC-23: renders section Markdown without raw HTML and hands the diagram to the Mermaid gate", () => {
    renderTour();
    const architecture = screen.getByRole("region", { name: "Architecture overview" });
    expect(architecture.querySelector("script")).toBeNull();
    expect(within(architecture).getByText("Fastify").tagName).toBe("STRONG");
    expect(screen.getAllByTestId("diagram")).toHaveLength(1);
  });

  it("shows a failed generation next to the stored tour", () => {
    renderTour({ error: "Couldn't regenerate the tour (timeout). The previous tour is kept." });
    expect(screen.getByRole("alert").textContent).toContain("The previous tour is kept.");
    expect(screen.getByRole("region", { name: "Architecture overview" })).toBeTruthy();
  });
});
