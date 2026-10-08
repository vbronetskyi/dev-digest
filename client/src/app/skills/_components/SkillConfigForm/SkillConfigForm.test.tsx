import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Skill } from "@devdigest/shared";
import messages from "../../../../../messages/en/skills.json";

const h = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), remove: vi.fn() }));

vi.mock("@/lib/hooks/skills", () => ({
  useCreateSkill: () => ({ mutate: h.create, isPending: false, error: null }),
  useUpdateSkill: () => ({ mutate: h.update, isPending: false, error: null }),
  useDeleteSkill: () => ({ mutate: h.remove, isPending: false }),
}));

import { SkillConfigForm } from "./SkillConfigForm";

const IMPORTED: Skill = {
  id: "sk1",
  name: "owasp-security",
  description: "OWASP checks",
  type: "security",
  source: "imported_url",
  source_url: "https://raw.githubusercontent.com/acme/skills/main/owasp/SKILL.md",
  body: "Check every input.",
  enabled: false,
  version: 3,
};

function renderForm(skill?: Skill) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages }}>
      <SkillConfigForm skill={skill} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  h.create.mockReset();
  h.update.mockReset();
});
afterEach(cleanup);

describe("SkillConfigForm", () => {
  it("validates against the shared contract before creating", () => {
    renderForm();
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0]!, { target: { value: "Query Efficiency" } });
    fireEvent.change(textboxes[1]!, { target: { value: "Flags N+1 queries" } });
    fireEvent.change(textboxes[2]!, { target: { value: "Look for queries inside loops." } });

    const create = screen.getByRole("button", { name: "Create skill" });
    expect(create).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/^name:/);

    fireEvent.change(textboxes[0]!, { target: { value: "query-efficiency" } });
    fireEvent.click(create);
    expect(h.create).toHaveBeenCalledWith(
      {
        name: "query-efficiency",
        description: "Flags N+1 queries",
        type: "rubric",
        body: "Look for queries inside loops.",
        enabled: true,
      },
      expect.anything(),
    );
  });

  it("warns about an imported skill and links its source", () => {
    renderForm(IMPORTED);
    expect(screen.getByRole("note")).toHaveTextContent("came from outside the workspace");
    expect(screen.getByText(IMPORTED.source_url!)).toBeInTheDocument();
  });

  it("says which version a body change will create", () => {
    renderForm(IMPORTED);
    expect(screen.getByText("No changes")).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue(IMPORTED.body), { target: { value: "Check every input twice." } });
    expect(screen.getByText("A changed body is saved as v4.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(h.update).toHaveBeenCalledWith(
      { id: "sk1", patch: expect.objectContaining({ body: "Check every input twice." }) },
      expect.anything(),
    );
  });
});
