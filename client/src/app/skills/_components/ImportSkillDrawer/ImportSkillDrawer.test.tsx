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

const h = vi.hoisted(() => ({ preview: vi.fn(), importSkill: vi.fn(), previewFile: vi.fn(), importFile: vi.fn() }));

vi.mock("@/lib/hooks/skills", () => ({
  usePreviewSkillImport: () => ({ mutate: h.preview, isPending: false, isError: false, error: null }),
  useImportSkill: () => ({ mutate: h.importSkill, isPending: false, isError: false, error: null }),
  usePreviewSkillFile: () => ({ mutate: h.previewFile, isPending: false, isError: false, error: null }),
  useImportSkillFile: () => ({ mutate: h.importFile, isPending: false, isError: false, error: null }),
}));

import { ImportSkillDrawer } from "./ImportSkillDrawer";

function renderDrawer(onImported = vi.fn(), initialMode: "file" | "url" = "url") {
  render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages }}>
      <ImportSkillDrawer initialMode={initialMode} onClose={vi.fn()} onImported={onImported} />
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
  h.previewFile.mockReset().mockImplementation((_req: unknown, opts: { onSuccess: (p: SkillImportPreview) => void }) =>
    opts.onSuccess({ ...PREVIEW, name: "error-handling", source_url: null, warnings: [] }),
  );
  h.importFile.mockReset();
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
    expect(screen.getByText(new RegExp(PREVIEW.source_url!))).toBeInTheDocument();
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

  it("imports an uploaded file: parsed on the server, sent with its name", async () => {
    renderDrawer(vi.fn(), "file");
    const body = "# Error handling\nThrow AppError subclasses.";
    const upload = new File([body], "error-handling.md", { type: "text/markdown" });
    // jsdom's File has no text(); browsers do.
    Object.defineProperty(upload, "text", { value: async () => body });
    fireEvent.change(screen.getByLabelText("Choose a .md file"), { target: { files: [upload] } });
    expect(await screen.findByDisplayValue(/Throw AppError subclasses/)).toBeInTheDocument();
    expect(screen.getByText(/error-handling\.md · /)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(h.previewFile).toHaveBeenCalledWith({ text: body, filename: "error-handling.md" }, expect.anything());
    expect(screen.getByText("From file: error-handling.md")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Import skill" }));
    expect(h.importFile).toHaveBeenCalledWith(
      { text: body, filename: "error-handling.md", name: "error-handling", type: "security" },
      expect.anything(),
    );
  });

  it("refuses a file over the size cap before reading it", () => {
    renderDrawer(vi.fn(), "file");
    const big = new File(["x"], "big.md");
    Object.defineProperty(big, "size", { value: 300 * 1024 });
    fireEvent.change(screen.getByLabelText("Choose a .md file"), { target: { files: [big] } });
    expect(screen.getByRole("alert")).toHaveTextContent("larger than 256 KB");
    expect(screen.getByRole("button", { name: "Preview" })).toBeDisabled();
  });

  it("switches between file and URL tabs", () => {
    renderDrawer(vi.fn(), "file");
    expect(screen.queryByPlaceholderText(messages.url.placeholder)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /From URL/ }));
    expect(screen.getByPlaceholderText(messages.url.placeholder)).toBeInTheDocument();
  });
});
