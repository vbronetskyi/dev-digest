import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function heading(em: number, weight: number, margin: string): React.CSSProperties {
  return { fontSize: `${em}em`, fontWeight: weight, margin, color: "var(--text-primary)", lineHeight: 1.3 };
}

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
          h1: ({ children }) => <h1 style={heading(1.35, 700, "14px 0 8px")}>{children}</h1>,
          h2: ({ children }) => <h2 style={heading(1.18, 650, "14px 0 6px")}>{children}</h2>,
          h3: ({ children }) => <h3 style={heading(1.05, 650, "12px 0 6px")}>{children}</h3>,
          h4: ({ children }) => <h4 style={heading(1, 650, "10px 0 4px")}>{children}</h4>,
          h5: ({ children }) => <h5 style={heading(1, 650, "10px 0 4px")}>{children}</h5>,
          h6: ({ children }) => <h6 style={heading(1, 650, "10px 0 4px")}>{children}</h6>,
          ul: ({ children }) => <ul style={{ margin: "0 0 10px", paddingLeft: 20, listStyle: "disc" }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: "0 0 10px", paddingLeft: 22, listStyle: "decimal" }}>{children}</ol>,
          li: ({ children }) => <li style={{ margin: "2px 0" }}>{children}</li>,
          pre: ({ children }) => (
            <pre style={{ margin: "0 0 10px", padding: "10px 12px", borderRadius: 7, background: "var(--bg-hover)", overflowX: "auto" }}>
              {children}
            </pre>
          ),
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
          // In safe mode a link that lost its target is plain text, not a dead anchor.
          a: ({ children, href }) =>
            href ? (
              <a href={href} style={{ color: "var(--accent-text)", textDecoration: "underline" }}>
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
