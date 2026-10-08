import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { FindingRecord, ReviewRecord } from "@devdigest/shared";
import messages from "../../../../../../../messages/en/prReview.json";

const finding = (o: Partial<FindingRecord>): FindingRecord => ({
  id: "f",
  severity: "WARNING",
  category: "bug",
  title: "Untitled",
  file: "server/src/modules/reviews/routes.ts",
  start_line: 175,
  end_line: 175,
  rationale: "Something is off.",
  suggestion: null,
  confidence: 0.9,
  kind: "finding",
  trifecta_components: null,
  evidence: null,
  review_id: "r2",
  accepted_at: null,
  dismissed_at: null,
  ...o,
});

const REVIEWS: ReviewRecord[] = [
  {
    id: "r1",
    pr_id: "pr1",
    agent_id: "a1",
    run_id: "run1",
    agent_name: "General Reviewer",
    kind: "review",
    verdict: "comment",
    summary: null,
    score: 88,
    model: "m",
    created_at: "2026-10-07T10:00:00Z",
    findings: [finding({ id: "old", title: "Stale finding from an older run" })],
  },
  {
    id: "r2",
    pr_id: "pr1",
    agent_id: "a1",
    run_id: "run2",
    agent_name: "Security Reviewer",
    kind: "review",
    verdict: "request_changes",
    summary: null,
    score: 41,
    model: "m",
    created_at: "2026-10-07T12:00:00Z",
    findings: [
      finding({ id: "w", severity: "WARNING", title: "No timeout on fetch", category: "perf", confidence: 0.74 }),
      finding({
        id: "c",
        severity: "CRITICAL",
        title: "SSRF via webhook URL",
        category: "security",
        start_line: 170,
        end_line: 176,
        rationale: "The **url** comes straight from `req.body`.",
        confidence: 0.92,
      }),
    ],
  },
];

vi.mock("@/lib/hooks/reviews", () => ({
  usePrReviews: () => ({ data: REVIEWS, isLoading: false, isError: false }),
}));

import { FindingsCell } from "./FindingsCell";

afterEach(cleanup);

function renderCell(counts: Parameters<typeof FindingsCell>[0]["counts"]) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <FindingsCell prId="pr1" counts={counts} />
    </NextIntlClientProvider>,
  );
}

describe("FindingsCell — PR list FINDINGS column", () => {
  it("shows an icon and count for each present severity only", () => {
    renderCell({ CRITICAL: 1, WARNING: 1, SUGGESTION: 0 });
    expect(screen.getByLabelText("1 Critical")).toBeInTheDocument();
    expect(screen.getByLabelText("1 Warning")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Suggestion/)).not.toBeInTheDocument();
  });

  it("shows a dash for a PR that was never reviewed or came back clean", () => {
    renderCell(null);
    expect(screen.getByText("—")).toBeInTheDocument();
    cleanup();
    renderCell({ CRITICAL: 0, WARNING: 0, SUGGESTION: 0 });
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("FindingsCell — hover preview", () => {
  it("opens 'N findings in this run' for the latest run, with text-only previews", () => {
    renderCell({ CRITICAL: 1, WARNING: 1, SUGGESTION: 0 });
    fireEvent.mouseEnter(screen.getByLabelText("2 findings in the latest run"));

    const tip = screen.getByRole("tooltip");
    expect(within(tip).getByText("2 findings in this run")).toBeInTheDocument();
    // Latest run only, most severe first.
    expect(within(tip).queryByText("Stale finding from an older run")).not.toBeInTheDocument();
    const titles = within(tip).getAllByText(/SSRF via webhook URL|No timeout on fetch/).map((n) => n.textContent);
    expect(titles).toEqual(["SSRF via webhook URL", "No timeout on fetch"]);
    // Every preview field, no actions.
    expect(within(tip).getByText("server/src/modules/reviews/routes.ts:170-176")).toBeInTheDocument();
    expect(within(tip).getByText("92% conf")).toBeInTheDocument();
    expect(within(tip).getByText("security")).toBeInTheDocument();
    expect(within(tip).getByText("The url comes straight from req.body.")).toBeInTheDocument();
    expect(within(tip).queryAllByRole("button")).toHaveLength(0);
  });

  it("closes shortly after the pointer leaves", async () => {
    renderCell({ CRITICAL: 1, WARNING: 1, SUGGESTION: 0 });
    const cell = screen.getByLabelText("2 findings in the latest run");
    fireEvent.mouseEnter(cell);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.mouseLeave(cell);
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });
});
