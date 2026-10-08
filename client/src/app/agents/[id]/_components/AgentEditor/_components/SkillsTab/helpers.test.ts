import { describe, it, expect } from "vitest";
import { moveItem, orderedLinked } from "./helpers";

describe("SkillsTab helpers", () => {
  it("moves an item in both directions without mutating the input", () => {
    const list = ["a", "b", "c", "d"];
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(list, 3, 1)).toEqual(["a", "d", "b", "c"]);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });

  it("returns a copy for no-op or out-of-range moves", () => {
    const list = ["a", "b"];
    expect(moveItem(list, 1, 1)).toEqual(list);
    expect(moveItem(list, 0, 5)).toEqual(list);
    expect(moveItem(list, -1, 0)).toEqual(list);
  });

  it("orders linked skills by link order and skips links to missing skills", () => {
    const library = [{ id: "s1" }, { id: "s2" }, { id: "s3" }];
    const links = [
      { skill_id: "s3", order: 0 },
      { skill_id: "gone", order: 1 },
      { skill_id: "s1", order: 2 },
    ];
    expect(orderedLinked(links, library).map((s) => s.id)).toEqual(["s3", "s1"]);
  });
});
