"use client";

import { useState, useCallback } from "react";
import {
  Tags, Eraser, Copy, Check, RotateCcw,
  Heading1, Heading2, Heading3, Bold, Italic, Underline,
  Link2, List, ListOrdered, Quote, Code, Type, Minus,
  WrapText, AlignLeft, ChevronDown, ChevronUp,
} from "lucide-react";

/* ── Tag Wrapping Helpers ─────────────────────────────── */
type WrapAction = {
  label: string;
  icon: React.ElementType;
  tag: string;
  block?: boolean;
  attrs?: string;
};

const WRAP_ACTIONS: WrapAction[] = [
  { label: "Paragraph", icon: AlignLeft, tag: "p", block: true },
  { label: "H1", icon: Heading1, tag: "h1", block: true },
  { label: "H2", icon: Heading2, tag: "h2", block: true },
  { label: "H3", icon: Heading3, tag: "h3", block: true },
  { label: "Bold", icon: Bold, tag: "strong" },
  { label: "Italic", icon: Italic, tag: "em" },
  { label: "Underline", icon: Underline, tag: "u" },
  { label: "Link", icon: Link2, tag: "a", attrs: ' href="#"' },
  { label: "Code", icon: Code, tag: "code" },
  { label: "Blockquote", icon: Quote, tag: "blockquote", block: true },
  { label: "Div", icon: Type, tag: "div", block: true },
  { label: "Span", icon: WrapText, tag: "span" },
];

function wrapInTag(text: string, tag: string, attrs = "", block = false): string {
  if (!text.trim()) return "";
  const open = `<${tag}${attrs}>`;
  const close = `</${tag}>`;
  if (block) {
    return text
      .split(/\n\n+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => `${open}${chunk}${close}`)
      .join("\n");
  }
  return `${open}${text}${close}`;
}

function textToList(text: string, ordered: boolean): string {
  const tag = ordered ? "ol" : "ul";
  const items = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `  <li>${line}</li>`)
    .join("\n");
  return `<${tag}>\n${items}\n</${tag}>`;
}

function autoParagraph(text: string): string {
  return text
    .split(/\n\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${chunk.replace(/\n/g, "<br>")}</p>`)
    .join("\n\n");
}

/* ── Tag Stripping ────────────────────────────────────── */
interface StripOptions {
  preserveBreaks: boolean;
  preserveLinks: boolean;
  preserveLists: boolean;
}

function stripTags(html: string, options: StripOptions): string {
  let result = html;

  // Preserve line breaks from block elements
  if (options.preserveBreaks) {
    result = result.replace(/<br\s*\/?>/gi, "\n");
    result = result.replace(/<\/(p|div|h[1-6]|li|blockquote|tr|section|article|header|footer|main)>/gi, "\n\n");
    result = result.replace(/<(hr)\s*\/?>/gi, "\n---\n");
  }

  // Preserve links as "text (url)"
  if (options.preserveLinks) {
    result = result.replace(/<a\s[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, "$2 ($1)");
  }

  // Preserve lists as bullet points
  if (options.preserveLists) {
    result = result.replace(/<li[^>]*>(.*?)<\/li>/gi, "• $1\n");
    result = result.replace(/<\/?[ou]l[^>]*>/gi, "\n");
  }

  // Strip all remaining tags
  result = result.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  result = result
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&copy;/g, "©")
    .replace(/&reg;/g, "®")
    .replace(/&trade;/g, "™");

  // Clean up whitespace
  result = result.replace(/[ \t]+/g, " ");
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.trim();

  return result;
}

/* ── Main Component ───────────────────────────────────── */
export function HtmlTagTool() {
  const [mode, setMode] = useState<"generate" | "strip">("generate");

  // Generate mode state
  const [genInput, setGenInput] = useState("");
  const [genOutput, setGenOutput] = useState("");
  const [customTag, setCustomTag] = useState("");
  const [customAttrs, setCustomAttrs] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Strip mode state
  const [stripInput, setStripInput] = useState("");
  const [stripOutput, setStripOutput] = useState("");
  const [stripOptions, setStripOptions] = useState<StripOptions>({
    preserveBreaks: true,
    preserveLinks: true,
    preserveLists: true,
  });

  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  }, []);

  // ── Generate handlers ──
  const handleWrap = useCallback(
    (action: WrapAction) => {
      if (!genInput.trim()) return;
      const result = wrapInTag(genInput, action.tag, action.attrs || "", !!action.block);
      setGenOutput(result);
    },
    [genInput]
  );

  const handleList = useCallback(
    (ordered: boolean) => {
      if (!genInput.trim()) return;
      setGenOutput(textToList(genInput, ordered));
    },
    [genInput]
  );

  const handleAutoParagraph = useCallback(() => {
    if (!genInput.trim()) return;
    setGenOutput(autoParagraph(genInput));
  }, [genInput]);

  const handleCustomWrap = useCallback(() => {
    if (!genInput.trim() || !customTag.trim()) return;
    setGenOutput(wrapInTag(genInput, customTag.trim(), customAttrs ? ` ${customAttrs.trim()}` : "", true));
  }, [genInput, customTag, customAttrs]);

  // ── Strip handler ──
  const handleStrip = useCallback(() => {
    if (!stripInput.trim()) return;
    setStripOutput(stripTags(stripInput, stripOptions));
  }, [stripInput, stripOptions]);

  const outputText = mode === "generate" ? genOutput : stripOutput;

  return (
    <div>
      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("generate")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
            mode === "generate"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          }`}
        >
          <Tags size={16} /> Generate Tags
        </button>
        <button
          onClick={() => setMode("strip")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
            mode === "strip"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          }`}
        >
          <Eraser size={16} /> Remove Tags
        </button>
      </div>

      {/* ── Generate Tags Mode ───────────────────────── */}
      {mode === "generate" && (
        <>
          {/* Input */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Your Text</span>
              <span className="text-xs text-muted-foreground">
                {genInput.trim() ? genInput.trim().split(/\s+/).length : 0} words
              </span>
            </div>
            <textarea
              value={genInput}
              onChange={(e) => {
                setGenInput(e.target.value);
                setGenOutput("");
              }}
              placeholder="Paste or type your text here...&#10;&#10;For lists, put each item on a new line.&#10;For paragraphs, separate with blank lines."
              className="w-full h-40 sm:h-48 bg-transparent border-0 resize-none outline-none text-sm leading-relaxed placeholder:text-muted-foreground/50"
              spellCheck={false}
            />
          </div>

          {/* Tag Buttons */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Wrap in Tag
            </h3>

            {/* Quick actions row */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={handleAutoParagraph}
                disabled={!genInput.trim()}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                <AlignLeft size={14} /> Auto Paragraphs
              </button>
              <button
                onClick={() => handleList(false)}
                disabled={!genInput.trim()}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                <List size={14} /> Bullet List
              </button>
              <button
                onClick={() => handleList(true)}
                disabled={!genInput.trim()}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                <ListOrdered size={14} /> Numbered List
              </button>
              <button
                onClick={() => {
                  if (!genInput.trim()) return;
                  const lines = genInput.split(/\n/).filter((l) => l.trim());
                  setGenOutput(lines.map((l) => l.trim()).join("<br>\n"));
                }}
                disabled={!genInput.trim()}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                <Minus size={14} /> Line Breaks
              </button>
            </div>

            {/* Tag buttons grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {WRAP_ACTIONS.map((action) => (
                <button
                  key={action.tag}
                  onClick={() => handleWrap(action)}
                  disabled={!genInput.trim()}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors group"
                >
                  <action.icon size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-[11px] font-medium">{action.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">&lt;{action.tag}&gt;</span>
                </button>
              ))}
            </div>

            {/* Advanced: Custom tag */}
            <div className="mt-3">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                Custom Tag
              </button>
              {showAdvanced && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="Tag name (e.g. section)"
                    className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary w-40"
                  />
                  <input
                    type="text"
                    value={customAttrs}
                    onChange={(e) => setCustomAttrs(e.target.value)}
                    placeholder='Attributes (e.g. class="hero" id="main")'
                    className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary flex-1 min-w-[200px]"
                  />
                  <button
                    onClick={handleCustomWrap}
                    disabled={!genInput.trim() || !customTag.trim()}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Strip Tags Mode ──────────────────────────── */}
      {mode === "strip" && (
        <>
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Paste HTML</span>
              <span className="text-xs text-muted-foreground">
                {stripInput.length} characters
              </span>
            </div>
            <textarea
              value={stripInput}
              onChange={(e) => {
                setStripInput(e.target.value);
                setStripOutput("");
              }}
              placeholder='Paste HTML code here...&#10;&#10;Example: <h1>Hello</h1><p>This is a <strong>paragraph</strong> with <a href="#">links</a>.</p>'
              className="w-full h-40 sm:h-48 bg-transparent border-0 resize-none outline-none text-sm font-mono leading-relaxed placeholder:text-muted-foreground/50"
              spellCheck={false}
            />
          </div>

          {/* Strip Options */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Options
            </h3>
            <div className="flex flex-wrap gap-4">
              {[
                { key: "preserveBreaks" as const, label: "Preserve line breaks" },
                { key: "preserveLinks" as const, label: "Keep link URLs" },
                { key: "preserveLists" as const, label: "Keep list formatting" },
              ].map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stripOptions[opt.key]}
                    onChange={(e) =>
                      setStripOptions((prev) => ({ ...prev, [opt.key]: e.target.checked }))
                    }
                    className="rounded border-border"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleStrip}
              disabled={!stripInput.trim()}
              className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Eraser size={14} /> Remove All Tags
            </button>
          </div>
        </>
      )}

      {/* ── Output ───────────────────────────────────── */}
      {outputText && (
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              {mode === "generate" ? "HTML Output" : "Clean Text"}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(outputText)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-green-500" /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copy
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  if (mode === "generate") setGenOutput("");
                  else setStripOutput("");
                }}
                className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                <RotateCcw size={12} /> Clear
              </button>
            </div>
          </div>
          <pre className={`w-full bg-muted/50 rounded-lg p-4 text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap ${mode === "generate" ? "font-mono" : ""}`}>
            {outputText}
          </pre>

          {/* Live Preview for generate mode */}
          {mode === "generate" && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <span className="text-xs font-medium text-muted-foreground block mb-2">Live Preview</span>
              <div
                className="bg-white dark:bg-gray-900 rounded-lg p-4 text-sm prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: outputText }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
