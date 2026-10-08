import { describe, it, expect } from "vitest";
import { activeKeyFor } from "./helpers";

describe("activeKeyFor", () => {
  it("tells the repo's onboarding tour and project context apart from the add-repository page", () => {
    expect(activeKeyFor("/repos/r1/onboarding")).toBe("onboarding-tour");
    expect(activeKeyFor("/repos/r1/context")).toBe("context");
    expect(activeKeyFor("/onboarding")).toBe("");
    expect(activeKeyFor("/repos/r1/pulls/3")).toBe("pulls");
  });
});
