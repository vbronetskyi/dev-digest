import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import context from "../../../messages/en/context.json";

const BODY = [
  "# Public API",
  "<script>window.__pwned = true</script>",
  "[allowed](https://example.com/spec) [js](javascript:alert(1)) [relative](./other.md)",
  "![tracker](https://evil.example/pixel.png)",
].join("\n\n");

vi.mock("@/lib/hooks/context", () => ({
  useContextDoc: () => ({ data: { path: "specs/public-api.md", folder: "specs", body: BODY }, isLoading: false, isError: false }),
}));

import { ContextDocView } from "./ContextDocView";

afterEach(cleanup);

// SPEC-01 AC-19: repository Markdown renders without raw HTML, active links or images.
describe("ContextDocView", () => {
  it("AC-19: renders the document without raw HTML, non-http links or images", () => {
    render(
      <NextIntlClientProvider locale="en" messages={{ context }}>
        <ContextDocView repoId="r1" path="specs/public-api.md" />
      </NextIntlClientProvider>,
    );
    const body = screen.getByTestId("context-doc-body");
    expect(screen.getByRole("heading", { name: "Public API" })).toBeTruthy();
    expect(body.querySelector("script")).toBeNull();
    expect(body.querySelector("img")).toBeNull();
    expect(screen.getByText("allowed").getAttribute("href")).toBe("https://example.com/spec");
    expect(screen.getByText("js").getAttribute("href")).toBeFalsy();
    expect(screen.getByText("relative").getAttribute("href")).toBeFalsy();
  });
});
