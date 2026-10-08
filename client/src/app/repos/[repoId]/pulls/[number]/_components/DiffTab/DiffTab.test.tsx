import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrFile, SmartDiff } from "@devdigest/shared";
import prReview from "../../../../../../../../messages/en/prReview.json";
import shell from "../../../../../../../../messages/en/shell.json";

const h = vi.hoisted(() => ({
  smart: { data: undefined as SmartDiff | undefined, isLoading: false, isError: false },
}));
vi.mock("@/lib/hooks/smart-diff", () => ({ useSmartDiff: () => h.smart }));
vi.mock("@/lib/hooks/reviews", () => ({
  usePrComments: () => ({ data: [] }),
  useCreatePrComment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { DiffTab } from "./DiffTab";
import { roleSections } from "./helpers";

afterEach(cleanup);

// GitHub's order: alphabetical. The reviewer order puts the risky code first.
const FILES: PrFile[] = [
  { path: "pnpm-lock.yaml", additions: 1, deletions: 0, patch: "@@ -1,1 +1,2 @@\n a\n+lock-line-content" },
  { path: "server/src/index.ts", additions: 1, deletions: 0, patch: "@@ -1,1 +1,2 @@\n a\n+import share from './share.js';" },
  { path: "server/src/share.ts", additions: 3, deletions: 0, patch: "@@ -0,0 +1,3 @@\n+const url = req.body.url;\n+await fetch(url);\n+return ok;" },
] as PrFile[];

type SmartFile = SmartDiff["groups"][number]["files"][number];
const smartFile = (path: string, reason: SmartFile["reason"], findings: NonNullable<SmartFile["findings"]> = []) => {
  const f = FILES.find((x) => x.path === path)!;
  return { path, additions: f.additions, deletions: f.deletions, pseudocode_summary: null, reason, findings, finding_lines: findings.map((x) => x.start_line) };
};

const SMART: SmartDiff = {
  groups: [
    { role: "core", files: [smartFile("server/src/share.ts", "source", [{ id: "f1", start_line: 2, end_line: 2, severity: "CRITICAL", title: "SSRF via webhook URL" }])] },
    { role: "wiring", files: [smartFile("server/src/index.ts", "entrypoint")] },
    { role: "boilerplate", files: [smartFile("pnpm-lock.yaml", "lockfile")] },
  ],
  split_suggestion: { too_big: false, total_lines: 5, reviewable_lines: 4, proposed_splits: [] },
  reviews_used: 2,
  markers_stale: false,
};

const renderTab = () =>
  render(
    <NextIntlClientProvider locale="en" messages={{ prReview, shell }}>
      <DiffTab prId="p1" filesCount={FILES.length} files={FILES} canComment={false} />
    </NextIntlClientProvider>,
  );

const filePaths = () => screen.getAllByText(/^(pnpm-lock\.yaml|server\/src\/\w+\.ts)$/).map((el) => el.textContent);

describe("DiffTab", () => {
  it("groups files core → wiring → boilerplate, opens the file with a finding and folds the lockfile", () => {
    h.smart = { data: SMART, isLoading: false, isError: false };
    renderTab();
    expect(screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"))).toEqual(["Core logic", "Wiring", "Boilerplate"]);
    expect(filePaths()).toEqual(["server/src/share.ts", "server/src/index.ts", "pnpm-lock.yaml"]);

    const core = screen.getByRole("region", { name: "Core logic" });
    expect(within(core).getByText("1 finding")).toBeTruthy();
    expect(within(core).getByText("SSRF via webhook URL")).toBeTruthy();
    expect(screen.getByText("await fetch(url);").closest("[data-finding]")?.getAttribute("data-finding")).toBe("CRITICAL");
    expect(screen.getByText("const url = req.body.url;").closest("[data-finding]")).toBeNull();

    expect(screen.getByText("lockfile")).toBeTruthy();
    expect(screen.queryByText("lock-line-content")).toBeNull();
    expect(screen.getByText("Finding markers from the latest review of each of 2 agents.")).toBeTruthy();
  });

  it("switches to GitHub's order, keeping the finding markers but not the role notes", () => {
    h.smart = { data: SMART, isLoading: false, isError: false };
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: "Original order" }));
    expect(screen.queryAllByRole("region")).toHaveLength(0);
    expect(filePaths()).toEqual(["pnpm-lock.yaml", "server/src/index.ts", "server/src/share.ts"]);
    expect(screen.getByText("SSRF via webhook URL")).toBeTruthy();
    expect(screen.getByText("lock-line-content")).toBeTruthy();
    expect(screen.queryByText("lockfile")).toBeNull();
  });

  it("proposes splits for an oversized PR, or says there is no clean cut", () => {
    const paths = ["a/1.ts", "a/2.ts", "a/3.ts", "a/4.ts", "a/5.ts", "a/6.ts"];
    h.smart = {
      data: { ...SMART, split_suggestion: { too_big: true, total_lines: 900, reviewable_lines: 620, proposed_splits: [{ name: "server", files: paths }, { name: "client", files: ["c/x.tsx"] }] } },
      isLoading: false,
      isError: false,
    };
    renderTab();
    const banner = screen.getByRole("note");
    expect(within(banner).getByText("This PR is large: 620 changed lines to review (900 in total)")).toBeTruthy();
    expect(within(banner).getByText("6 files")).toBeTruthy();
    expect(within(banner).getByText(/a\/1\.ts, a\/2\.ts, a\/3\.ts, a\/4\.ts \+2 more/)).toBeTruthy();
    cleanup();

    h.smart = { data: { ...SMART, split_suggestion: { too_big: true, total_lines: 500, reviewable_lines: 450, proposed_splits: [] } }, isLoading: false, isError: false };
    renderTab();
    expect(screen.getByText(/no clean cut/)).toBeTruthy();
  });

  it("warns when the markers come from a review of an earlier commit", () => {
    h.smart = { data: { ...SMART, markers_stale: true }, isLoading: false, isError: false };
    renderTab();
    expect(screen.getByRole("status").textContent).toMatch(/earlier commit/);
    expect(screen.getByText("SSRF via webhook URL")).toBeTruthy();
  });

  it("falls back to GitHub's order when the smart diff is unavailable", () => {
    h.smart = { data: undefined, isLoading: false, isError: true };
    renderTab();
    expect(screen.queryByRole("button", { name: "Smart order" })).toBeNull();
    expect(screen.getByText(/Smart order is unavailable/)).toBeTruthy();
    expect(filePaths()).toEqual(["pnpm-lock.yaml", "server/src/index.ts", "server/src/share.ts"]);
  });
});

describe("roleSections", () => {
  it("never hides a file the smart diff does not list", () => {
    const sections = roleSections({ ...SMART, groups: SMART.groups.slice(0, 1) }, FILES);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.files.map((f) => f.path)).toEqual(["server/src/share.ts", "pnpm-lock.yaml", "server/src/index.ts"]);
  });
});
