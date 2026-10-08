import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { BlastRadius } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/blast.json";
import { columnY } from "./helpers";

const h = vi.hoisted(() => ({ blast: undefined as BlastRadius | undefined }));
vi.mock("@/lib/hooks/blast", () => ({
  useBlastRadius: () => ({ data: h.blast, isLoading: false, isError: false, error: null, refetch: vi.fn() }),
}));

import { BlastRadiusCard } from "./BlastRadiusCard";

afterEach(cleanup);

const BLAST: BlastRadius = {
  changed_symbols: [
    { name: "rateLimit", file: "src/ratelimit.ts", kind: "function", line: 10 },
    { name: "bucketKey", file: "src/ratelimit.ts", kind: "function", line: 40 },
  ],
  downstream: [
    {
      symbol: "rateLimit",
      callers: [{ name: "publicRouter", file: "src/api/public.ts", line: 23 }],
      endpoints_affected: ["GET /api/public/items", "POST /api/public/webhooks"],
      crons_affected: [],
    },
    { symbol: "bucketKey", callers: [], endpoints_affected: [], crons_affected: ["reset-buckets (hourly)"] },
  ],
  summary: "2 symbols changed → 1 caller, 2 endpoints, 1 cron",
  indexed_sha: "abcdef123456",
  duration_ms: 12,
};

function renderCard(blast: BlastRadius) {
  h.blast = blast;
  return render(
    <NextIntlClientProvider locale="en" messages={{ blast: messages }}>
      <BlastRadiusCard prId="p1" repo="acme/api" defaultBranch="main" />
    </NextIntlClientProvider>,
  );
}

describe("BlastRadiusCard", () => {
  it("shows the counts and where the numbers come from", () => {
    renderCard(BLAST);
    expect(screen.getByText("symbols").parentElement).toHaveTextContent("2symbols");
    expect(screen.getByText("callers").parentElement).toHaveTextContent("1callers");
    expect(screen.getByText("endpoints").parentElement).toHaveTextContent("2endpoints");
    expect(screen.getByText("cron/jobs").parentElement).toHaveTextContent("1cron/jobs");
    expect(screen.getByText("From the repo index at abcdef1 · 12 ms · no model call")).toBeInTheDocument();
  });

  it("tree: the first symbol is open; callers link to their line at the indexed commit", () => {
    renderCard(BLAST);
    const link = screen.getByRole("link", { name: "src/api/public.ts:23" });
    expect(link).toHaveAttribute("href", "https://github.com/acme/api/blob/abcdef123456/src/api/public.ts#L23");
    expect(screen.getByText("GET /api/public/items")).toBeInTheDocument();
    // second symbol collapsed until clicked
    expect(screen.queryByText("reset-buckets (hourly)")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /bucketKey\(\)/ }));
    expect(screen.getByText("reset-buckets (hourly)")).toBeInTheDocument();
    expect(screen.getByText("No resolved callers")).toBeInTheDocument();
  });

  it("graph: one symbol at a time, switchable", () => {
    renderCard(BLAST);
    fireEvent.click(screen.getByRole("button", { name: "graph" }));
    const svg = screen.getByRole("img", { name: "Blast radius graph" });
    expect(within(svg).getByText("publicRouter")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "bucketKey()" }));
    expect(within(screen.getByRole("img", { name: "Blast radius graph" })).queryByText("publicRouter")).toBeNull();
  });

  it("explains a degraded answer instead of showing empty numbers", () => {
    renderCard({ changed_symbols: [], downstream: [], summary: "x", degraded: { reason: "not_indexed", message: "The repository is not indexed yet." } });
    expect(screen.getByRole("note")).toHaveTextContent("not indexed yet");
    expect(screen.queryByText("symbols")).toBeNull();
  });

  it("lays out a column evenly, centring a single node", () => {
    expect(columnY(0, 1, 240)).toBe(120);
    expect([0, 1, 2].map((i) => columnY(i, 3, 240))).toEqual([28, 120, 212]);
  });
});
