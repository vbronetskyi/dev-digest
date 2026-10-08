import { describe, it, expect } from "vitest";
import { confidenceColor, parseEvidence, splitInlineCode } from "./helpers";

describe("conventions helpers", () => {
  it("splits a path from its line range", () => {
    expect(parseEvidence("server/src/app.ts:12-18")).toEqual({ file: "server/src/app.ts", start: 12, end: 18 });
    expect(parseEvidence("src/a.ts:7")).toEqual({ file: "src/a.ts", start: 7, end: 7 });
    expect(parseEvidence("src/a.ts")).toEqual({ file: "src/a.ts" });
  });

  it("splits inline code spans and leaves unpaired backticks alone", () => {
    expect(splitInlineCode("Use `now()` for `createdAt`")).toEqual(["Use ", "now()", " for ", "createdAt", ""]);
    expect(splitInlineCode("It's a `broken one")).toEqual(["It's a `broken one"]);
  });

  it("colours confidence like the design", () => {
    expect(confidenceColor(0.85)).toBe("var(--ok)");
    expect(confidenceColor(0.6)).toBe("var(--warn)");
  });
});
