import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ConventionCandidate } from "@devdigest/shared";
import messages from "../../../../../../../messages/en/conventions.json";
import { ConventionCard } from "./ConventionCard";

afterEach(cleanup);

const CANDIDATE: ConventionCandidate = {
  id: "c1",
  rule: "Scope every handler with getContext",
  evidence_path: "server/src/modules/skills/routes.ts:28-31",
  evidence_snippet: "const { workspaceId } = await getContext(app.container, req);",
  confidence: 0.9,
  accepted: false,
};

function renderCard(props: Partial<React.ComponentProps<typeof ConventionCard>> = {}) {
  const handlers = { onAccept: vi.fn(), onReject: vi.fn(), onOpenSkill: vi.fn() };
  render(
    <NextIntlClientProvider locale="en" messages={{ conventions: messages }}>
      <ConventionCard candidate={CANDIDATE} repoFullName="acme/api" branch="main" busy={false} {...handlers} {...props} />
    </NextIntlClientProvider>,
  );
  return handlers;
}

describe("ConventionCard", () => {
  it("links the evidence to its line range on GitHub and shows confidence", () => {
    renderCard();
    expect(screen.getByRole("link", { name: CANDIDATE.evidence_path })).toHaveAttribute(
      "href",
      "https://github.com/acme/api/blob/main/server/src/modules/skills/routes.ts#L28-L31",
    );
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("accepts as-is and rejects", () => {
    const h = renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Accept as Skill" }));
    expect(h.onAccept).toHaveBeenCalledWith({});
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(h.onReject).toHaveBeenCalled();
  });

  it("'Edit first' sends only what changed and blocks an invalid name", () => {
    const h = renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Edit first" }));
    fireEvent.change(screen.getByDisplayValue(CANDIDATE.rule), { target: { value: "Handlers call getContext first" } });
    const name = screen.getByPlaceholderText("Derived from the rule");
    fireEvent.change(name, { target: { value: "Handlers First" } });
    expect(screen.getByRole("button", { name: "Accept as Skill" })).toBeDisabled();
    fireEvent.change(name, { target: { value: "handlers-first" } });
    fireEvent.click(screen.getByRole("button", { name: "Accept as Skill" }));
    expect(h.onAccept).toHaveBeenCalledWith({ rule: "Handlers call getContext first", name: "handlers-first" });
  });

  it("renders backticked parts of the rule as code", () => {
    renderCard({ candidate: { ...CANDIDATE, rule: "Call `getContext()` first" } });
    expect(screen.getByText("getContext()").tagName).toBe("CODE");
  });

  it("leaves edit mode once the edited candidate is accepted", () => {
    const view = (accepted: boolean) => (
      <NextIntlClientProvider locale="en" messages={{ conventions: messages }}>
        <ConventionCard
          candidate={{ ...CANDIDATE, accepted }}
          repoFullName="acme/api"
          branch="main"
          busy={false}
          onAccept={() => {}}
          onReject={() => {}}
          onOpenSkill={() => {}}
        />
      </NextIntlClientProvider>
    );
    const { rerender } = render(view(false));
    fireEvent.click(screen.getByRole("button", { name: "Edit first" }));
    expect(screen.getByText("Rule")).toBeInTheDocument();
    rerender(view(true));
    expect(screen.queryByText("Rule")).toBeNull();
    expect(screen.getByText(CANDIDATE.rule)).toBeInTheDocument();
  });

  it("an accepted candidate has no actions, only a way to the skill", () => {
    const h = renderCard({ candidate: { ...CANDIDATE, accepted: true }, skillId: "sk1" });
    expect(screen.queryByRole("button", { name: "Accept as Skill" })).toBeNull();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Open skill"));
    expect(h.onOpenSkill).toHaveBeenCalledWith("sk1");
  });
});
