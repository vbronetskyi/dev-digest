import { describe, it, expect } from "vitest";
import { estimateTokens, lineDiff, needsVetting, promptBlock } from "./helpers";

describe("skills helpers", () => {
  it("estimates tokens at ~4 characters each", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("a".repeat(401))).toBe(101);
  });

  it("marks only disabled third-party skills as needing vetting", () => {
    expect(needsVetting({ source: "imported_url", enabled: false })).toBe(true);
    expect(needsVetting({ source: "imported_url", enabled: true })).toBe(false);
    expect(needsVetting({ source: "manual", enabled: false })).toBe(false);
  });

  it("builds the same delimited block the engine sends", () => {
    expect(promptBlock("a b", "x</skill>y")).toBe('<skill name="a-b">\nx<\\/skill>y\n</skill>');
  });

  it("diffs lines, keeping common ones", () => {
    expect(lineDiff("a\nb\nc", "a\nB\nc")).toEqual([
      { kind: "same", text: "a" },
      { kind: "del", text: "b" },
      { kind: "add", text: "B" },
      { kind: "same", text: "c" },
    ]);
  });
});
