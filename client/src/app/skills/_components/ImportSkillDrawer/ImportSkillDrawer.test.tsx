import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { SkillImportPreview } from "@devdigest/shared";
import messages from "../../../../../messages/en/skills.json";

const PREVIEW: SkillImportPreview = {
  name: "owasp-security",
  description: "",
  body: "# OWASP\nCheck every input.",
  type: "security",
  source_url: "https://raw.githubusercontent.com/acme/skills/main/owasp/SKILL.md",
  warnings: ["No YAML frontmatter — the name was derived from the URL."],
};

const h = vi.hoisted(() => ({ preview: vi.fn(), importSkill: vi.fn() }));

vi.mock("@/lib/hooks/skills", () => ({
  usePreviewSkillImport: () => ({ mutate: h.preview, isPending: false, isError: false, error: null }),
  useImportSkill: () => ({ mutate: h.importSkill, isPending: false, isError: false, error: null }),
}));

import { ImportSkillDrawer } from "./ImportSkillDrawer";

function renderDrawer(onImported = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages }}>
      <ImportSkillDrawer onClose={vi.fn()} onImported={onImported} />
    </NextIntlClientProvider>,
  );
  return onImported;
}

function openPreview() {
  fireEvent.change(screen.getByPlaceholderText(messages.url.placeholder), {
    target: { value: " https://github.com/acme/skills/blob/main/owasp/SKILL.md " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
}

beforeEach(() => {
  h.preview.mockReset().mockImplementation((_url: string, opts: { onSuccess: (p: SkillImportPreview) => void }) =>
    opts.onSuccess(PREVIEW),
  );
  h.importSkill.mockReset();
});
afterEach(cleanup);

describe("ImportSkillDrawer", () => {
  it("does not fetch until a URL is entered", () => {
    renderDrawer();
    expect(screen.getByRole("button", { name: "Preview" })).toBeDisabled();
  });

  it("shows the fetched body and the warnings before anything is saved", () => {
    renderDrawer();
    openPreview();
    expect(h.preview).toHaveBeenCalledWith("https://github.com/acme/skills/blob/main/owasp/SKILL.md", expect.anything());
    expect(screen.getByRole("note")).toHaveTextContent("No YAML frontmatter");
    expect(screen.getByText(/Check every input/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(PREVIEW.source_url))).toBeInTheDocument();
    expect(h.importSkill).not.toHaveBeenCalled();
  });

  it("blocks an invalid name and imports the previewed URL with the overrides", () => {
    const onImported = renderDrawer();
    openPreview();
    const name = screen.getByDisplayValue("owasp-security");
    fireEvent.change(name, { target: { value: "OWASP Security" } });
    expect(screen.getByRole("button", { name: "Import from URL" })).toBeDisabled();

    fireEvent.change(name, { target: { value: "owasp-top-ten" } });
    fireEvent.change(screen.getByDisplayValue("security"), { target: { value: "rubric" } });
    fireEvent.click(screen.getByRole("button", { name: "Import from URL" }));
    expect(h.importSkill).toHaveBeenCalledWith(
      { url: PREVIEW.source_url, name: "owasp-top-ten", type: "rubric" },
      expect.anything(),
    );

    const created = { id: "sk1", name: "owasp-top-ten" };
    h.importSkill.mock.calls[0]![1].onSuccess(created);
    expect(onImported).toHaveBeenCalledWith(created);
  });

  it("goes back to the URL step", () => {
    renderDrawer();
    openPreview();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByPlaceholderText(messages.url.placeholder)).toBeInTheDocument();
  });
});
