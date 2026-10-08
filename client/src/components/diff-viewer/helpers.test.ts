import { describe, it, expect } from "vitest";
import type { SmartDiffFinding } from "@devdigest/shared";
import { markFor, parsePatch } from "./helpers";

const finding = (id: string, start: number, end: number, severity: SmartDiffFinding["severity"]): SmartDiffFinding => ({
  id,
  start_line: start,
  end_line: end,
  severity,
  title: `finding ${id}`,
});

describe("markFor", () => {
  const lines = parsePatch("@@ -10,3 +10,4 @@\n a\n-b\n+c\n+d\n e");
  const at = (text: string) => lines.find((l) => l.text === text)!;

  it("marks new-side lines a finding covers, never removed lines or hunk headers", () => {
    const findings = [finding("1", 11, 12, "WARNING")];
    expect(markFor(at("c"), findings)).toEqual({ severity: "WARNING", starting: findings });
    expect(markFor(at("d"), findings)).toEqual({ severity: "WARNING", starting: [] });
    expect(markFor(at("b"), findings)).toBeNull();
    expect(markFor(lines[0]!, findings)).toBeNull();
    expect(markFor(at("e"), findings)).toBeNull();
  });

  it("colours by the worst covering finding and lists those starting on the line, worst first", () => {
    const mark = markFor(at("d"), [finding("s", 12, 12, "SUGGESTION"), finding("c", 10, 13, "CRITICAL"), finding("w", 12, 12, "WARNING")]);
    expect(mark?.severity).toBe("CRITICAL");
    expect(mark?.starting.map((f) => f.id)).toEqual(["w", "s"]);
  });
});
