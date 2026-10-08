import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";

const m = vi.hoisted(() => ({
  parse: vi.fn(async () => true as boolean),
  render: vi.fn(async () => ({ svg: '<svg data-testid="svg"></svg>' })),
}));
vi.mock("mermaid", () => ({ default: { initialize: vi.fn(), parse: m.parse, render: m.render } }));

import { MermaidDiagram } from "./MermaidDiagram";

afterEach(() => {
  cleanup();
  m.parse.mockReset();
  m.render.mockClear();
});

// SPEC-02 AC-23: a tour diagram is drawn only if it parses as Mermaid.
describe("MermaidDiagram", () => {
  it("AC-23: draws a diagram that parses", async () => {
    m.parse.mockResolvedValue(true);
    const { container } = render(<MermaidDiagram chart={"flowchart LR\n  A --> B"} />);
    await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
    expect(m.parse).toHaveBeenCalledWith("flowchart LR\n  A --> B", { suppressErrors: true });
  });

  it("AC-23: draws nothing when the parse fails, and never asks Mermaid to render prose", async () => {
    m.parse.mockResolvedValue(false);
    const broken = render(<MermaidDiagram chart={"flowchart LR\n  A[unclosed --> B"} />);
    await waitFor(() => expect(m.parse).toHaveBeenCalled());
    await waitFor(() => expect(broken.container.innerHTML).toBe(""));
    cleanup();
    const prose = render(<MermaidDiagram chart="Here is how the parts connect." />);
    await waitFor(() => expect(prose.container.innerHTML).toBe(""));
    expect(m.render).not.toHaveBeenCalled();
  });
});
