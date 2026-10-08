import { describe, it, expect } from "vitest";
import { s } from "./styles";

describe("FindingCard styles", () => {
  it("never mixes a border shorthand with per-side longhands", () => {
    for (const focused of [true, false]) {
      const keys = Object.keys(s.card(focused, "var(--crit)", false));
      expect(keys).not.toContain("border");
      expect(keys).not.toContain("borderColor");
      expect(keys).toContain("borderLeftColor");
    }
  });
});
