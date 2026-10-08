import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ContextDocList } from "@devdigest/shared";
import context from "../../../../../messages/en/context.json";

const h = vi.hoisted(() => ({
  list: { docs: [], reason: null } as ContextDocList,
  search: new URLSearchParams(),
  replace: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ repoId: "r1" }),
  usePathname: () => "/repos/r1/context",
  useSearchParams: () => h.search,
  useRouter: () => ({ replace: h.replace }),
}));
vi.mock("@/components/app-shell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/repo-not-found", () => ({ RepoNotFound: () => <div>repo not found</div> }));
vi.mock("@/lib/repo-context", () => ({
  useActiveRepo: () => ({ activeRepo: { full_name: "acme/api", default_branch: "trunk" } }),
  useRepoNotFound: () => false,
}));
vi.mock("@/lib/hooks/context", () => ({
  useContextDocs: () => ({ data: h.list, isLoading: false, isError: false }),
  useContextDoc: (_repo: string, path: string) => ({ data: { path, folder: "specs", body: `# ${path}` }, isLoading: false, isError: false }),
}));

import ProjectContextPage from "./page";

afterEach(() => {
  cleanup();
  h.replace.mockReset();
  h.search = new URLSearchParams();
});

const doc = (path: string, folder: "specs" | "docs") => ({ path, folder, name: path.split("/").pop()!, bytes: 400, tokens: 100, used_by: 1 });
const renderPage = () =>
  render(
    <NextIntlClientProvider locale="en" messages={{ context }}>
      <ProjectContextPage />
    </NextIntlClientProvider>,
  );

// SPEC-01 AC-18 at page level: which repository, which state, which document.
describe("Project Context page", () => {
  it("AC-18: says the repository is not cloned yet instead of listing nothing", () => {
    h.list = { docs: [], reason: "no_clone" };
    renderPage();
    expect(screen.getByText("Repository not cloned yet")).toBeTruthy();
  });

  it("AC-18: says where to put documents when the repository has none, naming its default branch", () => {
    h.list = { docs: [], reason: null };
    renderPage();
    expect(screen.getByText("No specs, docs or insights yet")).toBeTruthy();
    expect(screen.getByText(/push it to trunk/)).toBeTruthy();
  });

  it("AC-18: shows the active repository's documents and the one ?doc= names, else the first", () => {
    h.list = { docs: [doc("specs/a.md", "specs"), doc("docs/b.md", "docs")], reason: null };
    h.search = new URLSearchParams("doc=docs%2Fb.md");
    renderPage();
    expect(screen.getAllByRole("heading", { level: 1 })[0]!.textContent).toBe("Project context for acme/api");
    expect(screen.getByRole("article", { name: "docs/b.md" })).toBeTruthy();
    fireEvent.click(screen.getByTitle("specs/a.md"));
    expect(h.replace).toHaveBeenCalledWith("/repos/r1/context?doc=specs%2Fa.md", { scroll: false });
    cleanup();
    h.search = new URLSearchParams("doc=gone.md");
    renderPage();
    expect(screen.getByRole("article", { name: "specs/a.md" })).toBeTruthy();
  });
});
