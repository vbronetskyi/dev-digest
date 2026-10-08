import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Only absolute http(s) links survive in `safe` mode; anything else loses its href. */
function httpOnly(url: string): string | null {
  return /^https?:\/\//i.test(url) ? url : null;
}

/**
 * Markdown renderer (replaces prototype mdLite). Inline + GFM. Raw HTML is never
 * rendered. `safe` is for text written outside DevDigest (repository documents,
 * model output): only http(s) links keep their target and images are dropped,
 * so the page never loads anything the text points at.
 */
export function Markdown({ children, safe = false }: { children?: string | null; safe?: boolean }) {
  if (!children) return null;
  return (
    <div className="dd-md" style={{ fontSize: "inherit", lineHeight: 1.55 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        {...(safe ? { urlTransform: httpOnly, disallowedElements: ["img"] } : {})}
        components={{
          p: ({ children }) => <p style={{ margin: "0 0 10px" }}>{children}</p>,
          strong: ({ children }) => (
            <strong style={{ fontWeight: 650, color: "var(--text-primary)" }}>{children}</strong>
          ),
          code: ({ children }) => (
            <code
              className="mono"
              style={{
                fontSize: "0.92em",
                padding: "1px 6px",
                borderRadius: 4,
                background: "var(--bg-hover)",
                color: "var(--accent-text)",
              }}
            >
              {children}
            </code>
          ),
          a: ({ children, href }) => (
            <a href={href} style={{ color: "var(--accent-text)", textDecoration: "underline" }}>
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
