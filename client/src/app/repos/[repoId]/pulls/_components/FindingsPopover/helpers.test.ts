import { describe, it, expect } from "vitest";
import type { ReviewRecord } from "@devdigest/shared";
import { latestReview, locationOf, placePopover, plainText } from "./helpers";

const VIEWPORT = { width: 1440, height: 900 };

describe("placePopover", () => {
  it("opens below a cell near the top of the screen", () => {
    const p = placePopover({ top: 200, bottom: 220, left: 600 }, VIEWPORT, 380);
    expect(p.top).toBe(228);
    expect(p.bottom).toBeUndefined();
  });

  it("opens above a cell near the bottom of the screen", () => {
    const p = placePopover({ top: 820, bottom: 840, left: 600 }, VIEWPORT, 380);
    expect(p.bottom).toBe(900 - 820 + 8);
    expect(p.top).toBeUndefined();
  });

  it("never runs off the right edge", () => {
    const p = placePopover({ top: 200, bottom: 220, left: 1300 }, VIEWPORT, 380);
    expect(p.left + 380).toBeLessThanOrEqual(1440);
  });
});

describe("latestReview", () => {
  const review = (o: Partial<ReviewRecord>) =>
    ({ id: "r", kind: "review", created_at: "2026-10-01T10:00:00Z", findings: [], ...o }) as ReviewRecord;

  it("picks the newest review and ignores summary records", () => {
    const picked = latestReview([
      review({ id: "old", created_at: "2026-10-01T10:00:00Z" }),
      review({ id: "summary", kind: "summary", created_at: "2026-10-03T10:00:00Z" }),
      review({ id: "new", created_at: "2026-10-02T10:00:00Z" }),
    ]);
    expect(picked?.id).toBe("new");
  });
});

describe("formatting", () => {
  it("renders single lines and ranges", () => {
    expect(locationOf({ file: "a.ts", start_line: 3, end_line: 3 })).toBe("a.ts:3");
    expect(locationOf({ file: "a.ts", start_line: 3, end_line: 9 })).toBe("a.ts:3-9");
  });

  it("strips bold and code markers", () => {
    expect(plainText("Uses **unvalidated** `url`\n here")).toBe("Uses unvalidated url here");
  });
});
