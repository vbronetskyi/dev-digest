import { describe, it, expect } from "vitest";
import { formatCost, NO_COST } from "./format-cost";

describe("formatCost", () => {
  it("renders unknown cost as a dash, never as zero", () => {
    expect(formatCost(null)).toBe(NO_COST);
    expect(formatCost(undefined)).toBe(NO_COST);
    expect(formatCost(Number.NaN)).toBe(NO_COST);
  });

  it("keeps sub-cent costs visible with three significant digits", () => {
    expect(formatCost(0.0004)).toBe("$0.0004");
    expect(formatCost(0.012)).toBe("$0.012");
    expect(formatCost(0.0123456)).toBe("$0.0123");
  });

  it("uses cents from one dollar up", () => {
    expect(formatCost(1.5)).toBe("$1.50");
    expect(formatCost(12.345)).toBe("$12.35");
  });

  it("shows a genuinely free run as $0", () => {
    expect(formatCost(0)).toBe("$0");
  });
});
