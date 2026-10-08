import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrIntentRecord } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/brief.json";

const h = vi.hoisted(() => ({
  intent: null as PrIntentRecord | null,
  mutate: vi.fn(),
  derive: { isPending: false, isError: false, error: null as unknown },
}));
vi.mock("@/lib/hooks/intent", () => ({
  usePrIntent: () => ({ data: { intent: h.intent }, isLoading: false, isError: false }),
  useDeriveIntent: () => ({ mutate: h.mutate, ...h.derive }),
}));

import { IntentCard } from "./IntentCard";

afterEach(() => {
  cleanup();
  h.mutate.mockReset();
  h.derive = { isPending: false, isError: false, error: null };
});

const INTENT: PrIntentRecord = {
  pr_id: "p1",
  intent: "Let users forward a finished review to their own webhook",
  in_scope: ["POST /reviews/:id/share"],
  out_of_scope: [],
  head_sha: "abcdef1234",
  model: "deepseek/deepseek-v4-flash",
  cost_usd: 0.00042,
  created_at: "2026-10-08T10:00:00Z",
};

const renderCard = (headSha = "abcdef1234") =>
  render(
    <NextIntlClientProvider locale="en" messages={{ brief: messages }}>
      <IntentCard prId="p1" headSha={headSha} />
    </NextIntlClientProvider>,
  );

describe("IntentCard", () => {
  it("offers to derive when there is none, without calling the model on its own", () => {
    h.intent = null;
    renderCard();
    expect(screen.getByText(/Not derived yet/)).toBeInTheDocument();
    expect(h.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Derive intent" }));
    expect(h.mutate).toHaveBeenCalledTimes(1);
  });

  it("shows the intent, both scopes and where it came from", () => {
    h.intent = INTENT;
    renderCard();
    expect(screen.getByText(`“${INTENT.intent}”`)).toBeInTheDocument();
    expect(screen.getByText("POST /reviews/:id/share")).toBeInTheDocument();
    expect(screen.getByText("Nothing stated")).toBeInTheDocument();
    expect(screen.getByText("Derived by deepseek/deepseek-v4-flash · $0.00042 · for abcdef1")).toBeInTheDocument();
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("flags an intent derived for an older head", () => {
    h.intent = INTENT;
    renderCard("9999999999");
    expect(screen.getByRole("note")).toHaveTextContent("new commits");
  });

  it("explains a failed derivation", () => {
    h.intent = null;
    h.derive = { isPending: false, isError: true, error: new Error("boom") };
    renderCard();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not derive the intent: Error: boom");
  });
});
