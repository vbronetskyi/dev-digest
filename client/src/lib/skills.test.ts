import { describe, it, expect } from "vitest";
import { filterSkills } from "./skills";

describe("filterSkills", () => {
  it("filters by name or description, case-insensitively", () => {
    const list = [
      { name: "query-efficiency", description: "Flags N+1 queries" },
      { name: "null-not-zero", description: "Unknown stays null" },
    ];
    expect(filterSkills(list, "  N+1 ").map((s) => s.name)).toEqual(["query-efficiency"]);
    expect(filterSkills(list, "null")).toHaveLength(1);
    expect(filterSkills(list, "")).toHaveLength(2);
  });
});
