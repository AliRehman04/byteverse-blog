"use client";

import { useState, useCallback } from "react";
import {
  Code, Copy, Check, RotateCcw, Loader2,
  Minimize2, Maximize2, ChevronDown,
} from "lucide-react";

/* ── Supported Languages ──────────────────────────────── */
type Lang = "json" | "html" | "css" | "javascript" | "sql" | "xml";

const LANGUAGES: { value: Lang; label: string }[] = [
  { value: "json", label: "JSON" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "javascript", label: "JavaScript" },
  { value: "sql", label: "SQL" },
  { value: "xml", label: "XML" },
];

/* ── JSON Formatter ───────────────────────────────────── */
function formatJson(input: string, indent: number): string {
  const parsed = JSON.parse(input);
  return JSON.stringify(parsed, null, indent);
}

function minifyJson(input: string): string {
  const parsed = JSON.parse(input);
  return JSON.stringify(parsed);
}

/* ── HTML/XML Formatter ───────────────────────────────── */
function formatHtmlXml(input: string, indent: number): string {
  const tab = " ".repeat(indent);
  let result = "";
  let level = 0;
  // Normalize input
  const trimmed = input.replace(/>\s+</g, "><").trim();
  const tokens = trimmed.split(/(<[^>]+>)/g).filter(Boolean);

  for (const token of tokens) {
    if (token.startsWith("</")) {
      // Closing tag
      level = Math.max(0, level - 1);
      result += tab.repeat(level) + token + "\n";
    } else if (token.startsWith("<") && !token.startsWith("<!") && !token.startsWith("<?") && !token.endsWith("/>")) {
      // Opening tag
      result += tab.repeat(level) + token + "\n";
      level++;
    } else if (token.startsWith("<")) {
      // Self-closing, comment, or doctype
      result += tab.repeat(level) + token + "\n";
    } else {
      // Text content
      const text = token.trim();
      if (text) {
        result += tab.repeat(level) + text + "\n";
      }
    }
  }
  return result.trimEnd();
}

function minifyHtmlXml(input: string): string {
  return input
    .replace(/\n/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}

/* ── CSS Formatter ────────────────────────────────────── */
function formatCss(input: string, indent: number): string {
  const tab = " ".repeat(indent);
  let result = "";
  let level = 0;
  // Normalize
  const clean = input.replace(/\s+/g, " ").trim();
  let i = 0;

  while (i < clean.length) {
    const ch = clean[i];

    if (ch === "{") {
      result = result.trimEnd() + " {\n";
      level++;
      i++;
    } else if (ch === "}") {
      level = Math.max(0, level - 1);
      result += tab.repeat(level) + "}\n\n";
      i++;
    } else if (ch === ";") {
      result += ";\n";
      i++;
      // Skip whitespace after semicolon
      while (i < clean.length && clean[i] === " ") i++;
    } else if (ch === "\n" || (ch === " " && result.endsWith("\n"))) {
      i++;
    } else {
      if (result.endsWith("\n") || result === "") {
        result += tab.repeat(level);
      }
      result += ch;
      i++;
    }
  }

  return result.trimEnd();
}

function minifyCss(input: string): string {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};:,>~+])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

/* ── JavaScript Formatter ─────────────────────────────── */
function formatJavaScript(input: string, indent: number): string {
  const tab = " ".repeat(indent);
  let result = "";
  let level = 0;
  let inString: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  let prevCh = "";

  const clean = input.replace(/\r\n/g, "\n").trim();

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1] || "";

    // Handle strings
    if (inString) {
      result += ch;
      if (ch === inString && prevCh !== "\\") inString = null;
      prevCh = ch;
      continue;
    }

    // Handle comments
    if (inLineComment) {
      result += ch;
      if (ch === "\n") { inLineComment = false; result += tab.repeat(level); }
      prevCh = ch;
      continue;
    }
    if (inBlockComment) {
      result += ch;
      if (ch === "*" && next === "/") { result += "/"; i++; inBlockComment = false; result += "\n" + tab.repeat(level); }
      prevCh = ch;
      continue;
    }

    // Detect strings/comments start
    if (ch === '"' || ch === "'" || ch === "`") { inString = ch; result += ch; prevCh = ch; continue; }
    if (ch === "/" && next === "/") { inLineComment = true; result += ch; prevCh = ch; continue; }
    if (ch === "/" && next === "*") { inBlockComment = true; result += ch; prevCh = ch; continue; }

    // Braces
    if (ch === "{" || ch === "[" || ch === "(") {
      result += ch + "\n";
      level++;
      result += tab.repeat(level);
      prevCh = ch;
      continue;
    }
    if (ch === "}" || ch === "]" || ch === ")") {
      level = Math.max(0, level - 1);
      result = result.trimEnd() + "\n" + tab.repeat(level) + ch;
      prevCh = ch;
      continue;
    }
    if (ch === ";") {
      result += ";\n" + tab.repeat(level);
      prevCh = ch;
      continue;
    }
    if (ch === "\n") {
      if (!result.endsWith("\n")) result += "\n" + tab.repeat(level);
      prevCh = ch;
      continue;
    }
    if (ch === " " && result.endsWith(" ")) { prevCh = ch; continue; }

    result += ch;
    prevCh = ch;
  }

  return result.replace(/\n\s*\n\s*\n/g, "\n\n").trimEnd();
}

function minifyJs(input: string): string {
  return input
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\n/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*([{};:,=+\-*/<>!&|?()[\]])\s*/g, "$1")
    .trim();
}

/* ── SQL Formatter ────────────────────────────────────── */
function formatSql(input: string, indent: number): string {
  const tab = " ".repeat(indent);
  const keywords = [
    "SELECT", "FROM", "WHERE", "AND", "OR", "ORDER BY", "GROUP BY",
    "HAVING", "INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL JOIN",
    "CROSS JOIN", "JOIN", "ON", "INSERT INTO", "VALUES", "UPDATE",
    "SET", "DELETE FROM", "CREATE TABLE", "ALTER TABLE", "DROP TABLE",
    "LIMIT", "OFFSET", "UNION", "UNION ALL", "AS", "DISTINCT",
    "CASE", "WHEN", "THEN", "ELSE", "END", "IN", "NOT IN",
    "EXISTS", "NOT EXISTS", "BETWEEN", "LIKE", "IS NULL", "IS NOT NULL",
  ];

  let result = input.replace(/\s+/g, " ").trim();

  // Uppercase keywords
  for (const kw of keywords) {
    const rx = new RegExp(`\\b${kw.replace(/ /g, "\\s+")}\\b`, "gi");
    result = result.replace(rx, kw);
  }

  // Add newlines before major keywords
  const majorKeywords = [
    "SELECT", "FROM", "WHERE", "ORDER BY", "GROUP BY", "HAVING",
    "INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL JOIN", "CROSS JOIN", "JOIN",
    "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM",
    "CREATE TABLE", "ALTER TABLE", "DROP TABLE",
    "LIMIT", "OFFSET", "UNION", "UNION ALL",
  ];

  for (const kw of majorKeywords) {
    const rx = new RegExp(`\\b(${kw})\\b`, "g");
    result = result.replace(rx, `\n${kw}`);
  }

  // Indent sub-clauses
  const lines = result.split("\n").filter((l) => l.trim());
  const indentedKeywords = ["AND", "OR", "ON", "SET", "VALUES"];
  const formatted = lines.map((line) => {
    const trimmed = line.trim();
    if (indentedKeywords.some((kw) => trimmed.startsWith(kw + " ") || trimmed === kw)) {
      return tab + trimmed;
    }
    return trimmed;
  });

  return formatted.join("\n").trim();
}

function minifySql(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/* ── Main Format Function ─────────────────────────────── */
function formatCode(input: string, lang: Lang, indent: number, minify: boolean): { output: string; error: string } {
  try {
    if (!input.trim()) return { output: "", error: "" };

    if (minify) {
      switch (lang) {
        case "json": return { output: minifyJson(input), error: "" };
        case "html":
        case "xml": return { output: minifyHtmlXml(input), error: "" };
        case "css": return { output: minifyCss(input), error: "" };
        case "javascript": return { output: minifyJs(input), error: "" };
        case "sql": return { output: minifySql(input), error: "" };
      }
    }

    switch (lang) {
      case "json": return { output: formatJson(input, indent), error: "" };
      case "html":
      case "xml": return { output: formatHtmlXml(input, indent), error: "" };
      case "css": return { output: formatCss(input, indent), error: "" };
      case "javascript": return { output: formatJavaScript(input, indent), error: "" };
      case "sql": return { output: formatSql(input, indent), error: "" };
      default: return { output: input, error: "" };
    }
  } catch (e) {
    return { output: "", error: e instanceof Error ? e.message : "Invalid input" };
  }
}

/* ── Component ────────────────────────────────────────── */
export function CodeFormatterTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [lang, setLang] = useState<Lang>("json");
  const [indent, setIndent] = useState(2);
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const charCount = input.length;
  const lineCount = input ? input.split("\n").length : 0;

  const handleFormat = useCallback((minify = false) => {
    if (!input.trim()) return;
    setProcessing(true);
    setError("");
    setTimeout(() => {
      const result = formatCode(input, lang, indent, minify);
      setOutput(result.output);
      setError(result.error);
      setProcessing(false);
    }, 100);
  }, [input, lang, indent]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  }, [output]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
      // Auto-detect language
      const trimmed = text.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) setLang("json");
      else if (trimmed.startsWith("<!") || trimmed.startsWith("<html") || /<\w+[\s>]/i.test(trimmed)) setLang("html");
      else if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(trimmed)) setLang("sql");
      else if (/[{}\s]*[\w.-]+\s*:\s*[^;]+;/m.test(trimmed) && !trimmed.includes("function")) setLang("css");
      else if (trimmed.startsWith("<?xml") || trimmed.startsWith("<")) setLang("xml");
    } catch { /* noop */ }
  }, []);

  return (
    <div>
      {/* Controls */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5 mb-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <Code size={14} />
              {LANGUAGES.find((l) => l.value === lang)?.label}
              <ChevronDown size={14} className={`transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-20 py-1 min-w-[140px]">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => { setLang(l.value); setLangOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors ${lang === l.value ? "font-semibold text-primary" : ""}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Indent size */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Indent:</span>
            {[2, 4].map((n) => (
              <button
                key={n}
                onClick={() => setIndent(n)}
                className={`px-2.5 py-1 rounded-md border transition-colors text-xs font-medium ${
                  indent === n ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
            <span>{charCount.toLocaleString()} chars</span>
            <span>{lineCount} lines</span>
          </div>
        </div>

        {/* Input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Paste your ${LANGUAGES.find((l) => l.value === lang)?.label} code here...`}
          className="w-full h-56 sm:h-64 bg-muted/30 border border-border rounded-xl p-4 font-mono text-sm leading-relaxed resize-none outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
          spellCheck={false}
        />

        {/* Action buttons */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <div className="flex gap-2">
            {input && (
              <button
                onClick={() => { setInput(""); setOutput(""); setError(""); }}
                className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1"
              >
                <RotateCcw size={12} /> Clear
              </button>
            )}
            <button
              onClick={handlePaste}
              className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1"
            >
              Paste
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFormat(true)}
              disabled={!input.trim() || processing}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Minimize2 size={14} /> Minify
            </button>
            <button
              onClick={() => handleFormat(false)}
              disabled={!input.trim() || processing}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {processing ? <><Loader2 size={14} className="animate-spin" /> Formatting...</> : <><Maximize2 size={14} /> Format</>}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 text-sm text-red-500">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Output */}
      {output && (
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">
              Formatted Output — {output.split("\n").length} lines, {output.length.toLocaleString()} chars
            </span>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              {copied ? <><Check size={12} className="text-green-500" /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
          <pre className="w-full max-h-96 overflow-auto bg-muted/30 border border-border rounded-xl p-4 font-mono text-sm leading-relaxed whitespace-pre">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
