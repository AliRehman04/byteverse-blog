"use client";

import { useState, useCallback } from "react";
import { Copy, Check, ArrowRight } from "lucide-react";

// Simple Markdown to HTML converter (client-side, no dependencies)
function markdownToHtml(md: string): string {
  let html = md;

  // Code blocks (fenced) - must come before inline code
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const escaped = escapeHtml(code.trimEnd());
    return lang
      ? `<pre><code class="language-${lang}">${escaped}</code></pre>`
      : `<pre><code>${escaped}</code></pre>`;
  });

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>");

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr />");
  html = html.replace(/^\*\*\*$/gm, "<hr />");

  // Images (before links to avoid conflict)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Unordered lists
  html = html.replace(/^[\s]*[-*+]\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>\n$1</ul>");

  // Ordered lists
  html = html.replace(/^[\s]*\d+\.\s+(.+)$/gm, "<li>$1</li>");

  // Paragraphs - wrap remaining text lines
  const lines = html.split("\n");
  const result: string[] = [];
  let inBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("<h") ||
      trimmed.startsWith("<pre") ||
      trimmed.startsWith("<ul") ||
      trimmed.startsWith("</ul") ||
      trimmed.startsWith("<ol") ||
      trimmed.startsWith("</ol") ||
      trimmed.startsWith("<li") ||
      trimmed.startsWith("<blockquote") ||
      trimmed.startsWith("<hr") ||
      trimmed.startsWith("<img")
    ) {
      inBlock = true;
      result.push(line);
    } else if (trimmed === "") {
      inBlock = false;
      result.push("");
    } else if (!inBlock && trimmed.length > 0 && !trimmed.startsWith("<")) {
      result.push(`<p>${trimmed}</p>`);
    } else {
      result.push(line);
    }
  }

  return result.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SAMPLE = `# Hello World

This is a **bold** and *italic* example with \`inline code\`.

## Features

- Easy to use
- No sign-up required
- Runs in your browser

### Code Example

\`\`\`javascript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`

> This is a blockquote.

Check out [ByteVerse](https://www.byteverse.fyi) for more tools.

---

That's it! Simple and fast.`;

export function MarkdownToHtmlTool() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"html" | "preview">("html");

  const html = markdownToHtml(input);

  const copy = useCallback(async () => {
    if (!html) return;
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [html]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">Markdown Input</label>
            <button
              onClick={() => setInput(SAMPLE)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Load sample
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={20}
            placeholder="Type or paste your Markdown here..."
            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none leading-relaxed"
            spellCheck={false}
            autoFocus
          />
        </div>

        {/* Arrow (mobile) */}
        <div className="flex justify-center text-muted-foreground lg:hidden">
          <ArrowRight className="rotate-90" size={20} />
        </div>

        {/* Output */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setView("html")}
                className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${view === "html" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                HTML
              </button>
              <button
                onClick={() => setView("preview")}
                className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${view === "preview" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                Preview
              </button>
            </div>
            <button
              onClick={copy}
              disabled={!html}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors disabled:opacity-40"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy HTML"}
            </button>
          </div>

          {view === "html" ? (
            <pre className="bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm font-mono min-h-[28rem] max-h-[28rem] overflow-auto whitespace-pre-wrap break-all leading-relaxed">
              {html || <span className="text-muted-foreground">HTML output will appear here...</span>}
            </pre>
          ) : (
            <div
              className="bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm min-h-[28rem] max-h-[28rem] overflow-auto prose prose-neutral dark:prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: html || "<p class='text-muted-foreground'>Preview will appear here...</p>" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
