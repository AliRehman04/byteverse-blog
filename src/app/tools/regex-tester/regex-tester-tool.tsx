"use client";

import { useState, useMemo, useCallback } from "react";
import { Copy, Check, AlertTriangle, Info, Trash2 } from "lucide-react";

interface MatchResult {
  fullMatch: string;
  index: number;
  groups: string[];
  namedGroups: Record<string, string>;
}

const PRESETS = [
  { label: "Email", pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", flags: "g" },
  { label: "URL", pattern: "https?://[\\w\\-._~:/?#\\[\\]@!$&'()*+,;=%]+", flags: "g" },
  { label: "IPv4", pattern: "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b", flags: "g" },
  { label: "Phone (US)", pattern: "\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}", flags: "g" },
  { label: "Date (YYYY-MM-DD)", pattern: "\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])", flags: "g" },
  { label: "Hex Color", pattern: "#(?:[0-9a-fA-F]{3}){1,2}\\b", flags: "gi" },
  { label: "HTML Tag", pattern: "<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*>(.*?)<\\/\\1>", flags: "gs" },
  { label: "Whitespace Trim", pattern: "^\\s+|\\s+$", flags: "gm" },
];

const FLAG_OPTIONS = [
  { flag: "g", label: "Global", desc: "Find all matches" },
  { flag: "i", label: "Case Insensitive", desc: "Ignore letter case" },
  { flag: "m", label: "Multiline", desc: "^ and $ match line boundaries" },
  { flag: "s", label: "Dotall", desc: ". matches newlines too" },
  { flag: "u", label: "Unicode", desc: "Full Unicode support" },
];

export function RegexTesterTool() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [testStr, setTestStr] = useState("");
  const [replaceStr, setReplaceStr] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleFlag = useCallback((f: string) => {
    setFlags((prev) => (prev.includes(f) ? prev.replace(f, "") : prev + f));
  }, []);

  const { matches, error, highlightedHtml, replaceResult } = useMemo(() => {
    if (!pattern)
      return { matches: [] as MatchResult[], error: "", highlightedHtml: "", replaceResult: "" };

    try {
      const regex = new RegExp(pattern, flags);
      const found: MatchResult[] = [];
      let m: RegExpExecArray | null;

      // Safety: prevent infinite loops for zero-length matches
      let safety = 0;
      const maxMatches = 1000;

      if (flags.includes("g")) {
        while ((m = regex.exec(testStr)) !== null && safety++ < maxMatches) {
          found.push({
            fullMatch: m[0],
            index: m.index,
            groups: m.slice(1),
            namedGroups: m.groups ? { ...m.groups } : {},
          });
          if (m[0].length === 0) regex.lastIndex++;
        }
      } else {
        m = regex.exec(testStr);
        if (m) {
          found.push({
            fullMatch: m[0],
            index: m.index,
            groups: m.slice(1),
            namedGroups: m.groups ? { ...m.groups } : {},
          });
        }
      }

      // Build highlighted HTML
      let html = "";
      let lastIdx = 0;
      const colors = [
        "bg-yellow-300/50 dark:bg-yellow-500/30",
        "bg-cyan-300/50 dark:bg-cyan-500/30",
        "bg-pink-300/50 dark:bg-pink-500/30",
        "bg-green-300/50 dark:bg-green-500/30",
      ];

      for (let i = 0; i < found.length; i++) {
        const match = found[i];
        const before = testStr.slice(lastIdx, match.index);
        html += escapeHtml(before);
        html += `<mark class="${colors[i % colors.length]} px-0.5 rounded">${escapeHtml(match.fullMatch)}</mark>`;
        lastIdx = match.index + match.fullMatch.length;
      }
      html += escapeHtml(testStr.slice(lastIdx));

      // Replace result
      let replaced = "";
      if (showReplace) {
        try {
          replaced = testStr.replace(new RegExp(pattern, flags), replaceStr);
        } catch {
          replaced = "";
        }
      }

      return { matches: found, error: "", highlightedHtml: html, replaceResult: replaced };
    } catch (e) {
      return {
        matches: [] as MatchResult[],
        error: e instanceof Error ? e.message : "Invalid regex",
        highlightedHtml: "",
        replaceResult: "",
      };
    }
  }, [pattern, flags, testStr, replaceStr, showReplace]);

  const copyToClipboard = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    []
  );

  return (
    <div className="space-y-6">
      {/* Pattern input */}
      <div className="bg-card border border-border rounded-xl p-5">
        <label htmlFor="regex-pattern" className="text-sm font-medium mb-2 block">
          Regular Expression
        </label>
        <div className="flex gap-2 items-center">
          <span className="text-muted-foreground text-lg font-mono">/</span>
          <input
            id="regex-pattern"
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Enter regex pattern..."
            className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
            spellCheck={false}
          />
          <span className="text-muted-foreground text-lg font-mono">/</span>
          <input
            id="regex-flags"
            type="text"
            value={flags}
            onChange={(e) => setFlags(e.target.value.replace(/[^gimsuy]/g, ""))}
            className="w-16 bg-muted/50 border border-border rounded-lg px-2 py-2.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
            title="Regex flags"
          />
        </div>

        {/* Flags toggle */}
        <div className="flex flex-wrap gap-2 mt-3">
          {FLAG_OPTIONS.map((f) => (
            <button
              key={f.flag}
              onClick={() => toggleFlag(f.flag)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                flags.includes(f.flag)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 border-border text-muted-foreground hover:border-primary/50"
              }`}
              title={f.desc}
            >
              {f.label} ({f.flag})
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-500 text-sm">
            <AlertTriangle size={14} />
            <span className="font-mono">{error}</span>
          </div>
        )}
      </div>

      {/* Presets */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-medium mb-2">Common Patterns</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setPattern(p.pattern);
                setFlags(p.flags);
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-muted/50 border border-border hover:bg-primary/10 hover:border-primary/50 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Test string */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="test-string" className="text-sm font-medium">Test String</label>
          <button
            onClick={() => setTestStr("")}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>
        <textarea
          id="test-string"
          value={testStr}
          onChange={(e) => setTestStr(e.target.value)}
          placeholder="Enter test string here..."
          rows={6}
          className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
          spellCheck={false}
        />
      </div>

      {/* Highlighted matches */}
      {testStr && pattern && !error && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">
              Match Result{" "}
              <span className="text-muted-foreground font-normal">
                — {matches.length} match{matches.length !== 1 ? "es" : ""} found
              </span>
            </p>
            <button
              onClick={() => copyToClipboard(testStr)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div
            className="bg-muted/50 border border-border rounded-lg p-3 font-mono text-sm whitespace-pre-wrap break-all leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </div>
      )}

      {/* Match details */}
      {matches.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-medium mb-3">Match Details</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 text-muted-foreground font-medium">#</th>
                  <th className="pb-2 pr-4 text-muted-foreground font-medium">Match</th>
                  <th className="pb-2 pr-4 text-muted-foreground font-medium">Index</th>
                  <th className="pb-2 text-muted-foreground font-medium">Groups</th>
                </tr>
              </thead>
              <tbody>
                {matches.slice(0, 100).map((m, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 pr-4 font-mono text-xs break-all max-w-[200px]">
                      &ldquo;{m.fullMatch}&rdquo;
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{m.index}</td>
                    <td className="py-2 font-mono text-xs">
                      {m.groups.length > 0
                        ? m.groups.map((g, j) => (
                            <span key={j} className="inline-block bg-muted px-1.5 py-0.5 rounded mr-1 mb-1">
                              ${j + 1}: {g ?? "undefined"}
                            </span>
                          ))
                        : <span className="text-muted-foreground">—</span>}
                      {Object.keys(m.namedGroups).length > 0 &&
                        Object.entries(m.namedGroups).map(([k, v]) => (
                          <span key={k} className="inline-block bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-1 mb-1">
                            {k}: {v}
                          </span>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {matches.length > 100 && (
              <p className="text-xs text-muted-foreground mt-2">
                Showing first 100 of {matches.length} matches
              </p>
            )}
          </div>
        </div>
      )}

      {/* Replace */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="replace-string" className="text-sm font-medium">
            Replace (Optional)
          </label>
          <button
            onClick={() => setShowReplace(!showReplace)}
            className="text-xs text-primary hover:underline"
          >
            {showReplace ? "Hide" : "Show"} Replace
          </button>
        </div>
        {showReplace && (
          <>
            <input
              id="replace-string"
              type="text"
              value={replaceStr}
              onChange={(e) => setReplaceStr(e.target.value)}
              placeholder="Replacement string (supports $1, $2, etc.)"
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 mb-3"
              spellCheck={false}
            />
            {replaceResult && (
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground font-medium">Result</p>
                  <button
                    onClick={() => copyToClipboard(replaceResult)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
                <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                  {replaceResult}
                </pre>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick reference */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-primary" />
          <p className="text-sm font-medium">Quick Reference</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-xs font-mono">
          {[
            [".", "Any character (except newline)"],
            ["\\d", "Digit [0-9]"],
            ["\\w", "Word char [a-zA-Z0-9_]"],
            ["\\s", "Whitespace"],
            ["\\b", "Word boundary"],
            ["^", "Start of string/line"],
            ["$", "End of string/line"],
            ["*", "0 or more"],
            ["+", "1 or more"],
            ["?", "0 or 1 (optional)"],
            ["{n,m}", "Between n and m times"],
            ["[abc]", "Character class"],
            ["[^abc]", "Negated class"],
            ["(abc)", "Capture group"],
            ["(?:abc)", "Non-capture group"],
            ["(?<name>abc)", "Named group"],
            ["a|b", "Alternation (a or b)"],
            ["(?=abc)", "Positive lookahead"],
            ["(?!abc)", "Negative lookahead"],
          ].map(([token, desc]) => (
            <div key={token} className="flex gap-2 py-1">
              <span className="text-primary min-w-[80px]">{token}</span>
              <span className="text-muted-foreground font-sans">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
