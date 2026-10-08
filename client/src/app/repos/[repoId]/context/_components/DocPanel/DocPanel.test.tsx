import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ContextDoc } from "@devdigest/shared";
import context from "../../../../../../../messages/en/context.json";

vi.mock("@/lib/hooks/context", () => ({
  useContextDoc: () => ({ data: { path: "specs/public-api.md", folder: "specs", body: "# Public API" }, isLoading: false, isError: false }),
}));

import { DocPanel } from "./DocPanel";

afterEach(cleanup);

const doc = (used_by: number): ContextDoc => ({ path: "specs/public-api.md", folder: "specs", name: "public-api.md", bytes: 4800, tokens: 1200, used_by });
const renderPanel = (d: ContextDoc) =>
  render(
    <NextIntlClientProvider locale="en" messages={{ context }}>
      <DocPanel repoId="r1" repoFullName="acme/api" branch="main" doc={d} />
    </NextIntlClientProvider>,
  );

// SPEC-01 AC-19: the selected document shows how many agents attach it.
describe("DocPanel", () => {
  it("AC-19: says how many agents attach the document, with its size and a link at the branch", () => {
    renderPanel(doc(2));
    expect(screen.getByText("Used by 2 agents")).toBeTruthy();
    expect(screen.getByText("≈ 1.2K tokens")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open on GitHub" }).getAttribute("href")).toBe("https://github.com/acme/api/blob/main/specs/public-api.md");
    cleanup();
    renderPanel(doc(0));
    expect(screen.getByText("Not attached to any agent")).toBeTruthy();
  });
});
