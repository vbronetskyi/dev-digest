import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ContextDoc } from "@devdigest/shared";
import context from "../../../../../../../messages/en/context.json";
import { DocList } from "./DocList";

afterEach(cleanup);

const doc = (path: string, folder: ContextDoc["folder"], tokens = 100): ContextDoc => ({
  path,
  folder,
  name: path.slice(path.lastIndexOf("/") + 1),
  bytes: tokens * 4,
  tokens,
  used_by: 0,
});
const DOCS = [doc("specs/public-api.md", "specs"), doc("server/docs/architecture.md", "docs", 1200), doc("client/insights/INSIGHTS.md", "insights"), doc("specs/rate-limits.md", "specs")];

// SPEC-01 AC-18: the page lists the active repository's documents grouped by folder kind.
describe("DocList", () => {
  it("AC-18: groups documents as specs, docs, insights, with directory and token estimate", () => {
    render(
      <NextIntlClientProvider locale="en" messages={{ context }}>
        <DocList docs={DOCS} selected="specs/public-api.md" onSelect={() => {}} />
      </NextIntlClientProvider>,
    );
    const groups = screen.getAllByRole("region");
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual(["Specs", "Docs", "Insights"]);
    expect(within(groups[0]!).getAllByRole("button").map((b) => b.getAttribute("title"))).toEqual(["specs/public-api.md", "specs/rate-limits.md"]);
    expect(within(groups[1]!).getByText("server/docs/")).toBeTruthy();
    expect(within(groups[1]!).getByText("1.2K")).toBeTruthy();
    expect(screen.getByRole("button", { current: true }).getAttribute("title")).toBe("specs/public-api.md");
  });

  it("selects a document on click", () => {
    const onSelect = vi.fn();
    render(
      <NextIntlClientProvider locale="en" messages={{ context }}>
        <DocList docs={DOCS} selected="specs/public-api.md" onSelect={onSelect} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByTitle("client/insights/INSIGHTS.md"));
    expect(onSelect).toHaveBeenCalledWith("client/insights/INSIGHTS.md");
  });
});
