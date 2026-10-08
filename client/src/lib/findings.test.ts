import { describe, it, expect } from "vitest";
import { countBySeverity, presentSeverities, totalFindings } from "./findings";

const f = (severity: string) => ({ severity });

describe("countBySeverity", () => {
  it("groups findings by their severity field", () => {
    expect(countBySeverity([f("CRITICAL"), f("WARNING"), f("CRITICAL"), f("SUGGESTION")])).toEqual({
      CRITICAL: 2,
      WARNING: 1,
      SUGGESTION: 1,
    });
  });

  it("returns zeros for no findings and ignores unknown levels", () => {
    expect(countBySeverity([])).toEqual({ CRITICAL: 0, WARNING: 0, SUGGESTION: 0 });
    expect(countBySeverity([f("INFO")])).toEqual({ CRITICAL: 0, WARNING: 0, SUGGESTION: 0 });
  });
});

describe("presentSeverities / totalFindings", () => {
  it("lists only non-empty levels, most severe first", () => {
    expect(presentSeverities({ CRITICAL: 0, WARNING: 3, SUGGESTION: 1 })).toEqual(["WARNING", "SUGGESTION"]);
    expect(totalFindings({ CRITICAL: 1, WARNING: 3, SUGGESTION: 1 })).toBe(5);
  });
});
