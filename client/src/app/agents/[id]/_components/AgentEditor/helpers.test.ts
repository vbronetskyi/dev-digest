import { describe, it, expect } from "vitest";
import { editorTab } from "./helpers";

describe("editorTab", () => {
  it("accepts every editor tab, Context included, and falls back to Config", () => {
    expect(editorTab("context")).toBe("context");
    expect(editorTab("skills")).toBe("skills");
    expect(editorTab("evals")).toBe("config");
    expect(editorTab(null)).toBe("config");
  });
});
