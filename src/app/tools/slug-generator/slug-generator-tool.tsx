"use client";

import { useState, useCallback } from "react";
import { Copy, Check, ArrowRight } from "lucide-react";

function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "-and-")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function SlugGeneratorTool() {
  const [input, setInput] = useState("");
  const [separator, setSeparator] = useState("-");
  const [maxLen, setMaxLen] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [copied, setCopied] = useState(false);

  const slug = (() => {
    let s = slugify(input);
    if (separator !== "-") s = s.replace(/-/g, separator);
    if (maxLen && parseInt(maxLen) > 0) {
      const max = parseInt(maxLen);
      s = s.slice(0, max).replace(new RegExp(`${separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");
    }
    if (prefix) s = prefix + separator + s;
    if (suffix) s = s + separator + suffix;
    return s;
  })();

  const copy = useCallback(async () => {
    if (!slug) return;
    await navigator.clipboard.writeText(slug);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [slug]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Input */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <label className="text-xs font-medium mb-1 block">Text to convert</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder="Enter your title, heading, or any text..."
            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Separator</label>
            <select value={separator} onChange={(e) => setSeparator(e.target.value)} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
              <option value="-">Hyphen (-)</option>
              <option value="_">Underscore (_)</option>
              <option value=".">Dot (.)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Max length</label>
            <input value={maxLen} onChange={(e) => setMaxLen(e.target.value)} type="number" min="0" placeholder="None" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Prefix</label>
            <input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="e.g. blog" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Suffix</label>
            <input value={suffix} onChange={(e) => setSuffix(e.target.value)} placeholder="e.g. 2025" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center text-muted-foreground"><ArrowRight className="rotate-90" size={20} /></div>

      {/* Output */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">Generated Slug</label>
          <button onClick={copy} disabled={!slug} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors disabled:opacity-40">
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 font-mono text-sm min-h-[2.5rem] break-all">
          {slug || <span className="text-muted-foreground">your-slug-will-appear-here</span>}
        </div>
        {slug && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{slug.length} characters</span>
            <span>{slug.split(separator).length} words</span>
          </div>
        )}
      </div>

      {/* Examples */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Examples</p>
        <div className="space-y-2">
          {[
            "How to Build a REST API with Node.js",
            "10 Best VS Code Extensions (2025 Edition!)",
            "What is TypeScript? A Beginner's Guide",
            "Café & Restaurant: Top 5 Résumé Tips!",
          ].map((example) => (
            <button key={example} onClick={() => setInput(example)} className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between group">
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">{example}</span>
              <ArrowRight size={14} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
