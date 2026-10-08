import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { FindingRecord } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/prReview.json";

vi.mock("../../../../../../../lib/hooks/reviews", () => ({
  useFindingAction: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { FindingsPanel } from "./FindingsPanel";

afterEach(cleanup);

const FINDINGS: FindingRecord[] = [
  {
    id: "f1",
    severity: "CRITICAL",
    category: "security",
    title: "Hardcoded secret",
    file: "src/config.ts",
    start_line: 11,
    end_line: 11,
    rationale: "A secret is committed.",
    suggestion: null,
    confidence: 0.95,
    kind: "finding",
    trifecta_components: null,
    evidence: null,
    review_id: "r1",
    accepted_at: null,
    dismissed_at: null,
  },
];

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("FindingsPanel (smoke)", () => {
  it("renders the toolbar + a finding card", () => {
    renderWithIntl(<FindingsPanel findings={FINDINGS} prId="pr1" />);
    expect(screen.getByText("Hide low confidence")).toBeInTheDocument();
    expect(screen.getByText("Hardcoded secret")).toBeInTheDocument();
  });

  it("shows the empty state when nothing matches", () => {
    renderWithIntl(<FindingsPanel findings={[]} prId="pr1" />);
    expect(screen.getByText("No findings match")).toBeInTheDocument();
  });
});

function finding(o: Partial<FindingRecord>): FindingRecord {
  return { ...FINDINGS[0]!, ...o };
}

// 2 CRITICAL, 2 WARNING (one low-confidence), no SUGGESTION.
const MIXED: FindingRecord[] = [
  finding({ id: "c1", severity: "CRITICAL", title: "SSRF via webhook url" }),
  finding({ id: "w1", severity: "WARNING", title: "No timeout on fetch", confidence: 0.9 }),
  finding({ id: "c2", severity: "CRITICAL", title: "Secret in config" }),
  finding({ id: "w2", severity: "WARNING", title: "Unchecked status", confidence: 0.4 }),
];
const TITLES = MIXED.map((f) => f.title);

const pill = (sev: string) => document.querySelector(`[data-severity="${sev}"]`);
const filterButton = (name: string) =>
  within(screen.getByRole("group", { name: "Filter findings by severity" })).getByRole("button", { name });
const visibleTitles = () => TITLES.filter((title) => screen.queryByText(title));

describe("FindingsPanel — severity counts and filter", () => {
  it("shows a pill per present level whose number equals its cards", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    expect(pill("CRITICAL")).toHaveTextContent("2Critical");
    expect(pill("WARNING")).toHaveTextContent("2Warning");
    expect(pill("SUGGESTION")).toBeNull();
    expect(visibleTitles()).toHaveLength(4);
  });

  it("offers all three filters and disables an empty level", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    expect(filterButton("Critical")).toBeEnabled();
    expect(filterButton("Warning")).toBeEnabled();
    expect(filterButton("Suggestion")).toBeDisabled();
  });

  it("clicking a level keeps only its findings; clicking again restores the list", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    fireEvent.click(filterButton("Critical"));
    expect(filterButton("Critical")).toHaveAttribute("aria-pressed", "true");
    expect(visibleTitles()).toEqual(["SSRF via webhook url", "Secret in config"]);

    fireEvent.click(filterButton("Critical"));
    expect(filterButton("Critical")).toHaveAttribute("aria-pressed", "false");
    expect(visibleTitles()).toHaveLength(4);
  });

  it("counts follow the low-confidence toggle so pills keep matching the cards", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(pill("WARNING")).toHaveTextContent("1Warning");
    expect(screen.queryByText("Unchecked status")).not.toBeInTheDocument();
  });
});
