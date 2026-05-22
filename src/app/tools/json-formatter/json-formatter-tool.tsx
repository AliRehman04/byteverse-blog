"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Braces, Minimize2, Trash2 } from "lucide-react";

export function JsonFormatterTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [indent, setIndent] = useState(2);

  const format = useCallback(() => {
    if (!input.trim()) {
      setError("Please enter some JSON");
      setOutput("");
      return;
    }
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
      setError("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid JSON";
      setError(msg);
      setOutput("");
    }
  }, [input, indent]);

  const minify = useCallback(() => {
    if (!input.trim()) {
      setError("Please enter some JSON");
      setOutput("");
      return;
    }
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid JSON";
      setError(msg);
      setOutput("");
    }
  }, [input]);

  const copyOutput = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const clear = useCallback(() => {
    setInput("");
    setOutput("");
    setError("");
  }, []);

  const loadSample = useCallback(() => {
    const sample = JSON.stringify(
      {
        name: "ByteVerse",
        type: "tech-blog",
        features: ["AI Tools", "Coding", "Productivity"],
        stats: { posts: 40, categories: 5 },
        active: true,
      },
      null,
      2
    );
    setInput(sample);
    setOutput("");
    setError("");
  }, []);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={format}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Braces size={16} /> Format
        </button>
        <button
          onClick={minify}
          className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 border border-border transition-colors"
        >
          <Minimize2 size={16} /> Minify
        </button>
        <button
          onClick={copyOutput}
          disabled={!output}
          className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 border border-border transition-colors disabled:opacity-40"
        >
          {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={clear}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Trash2 size={16} /> Clear
        </button>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Indent:</label>
          <select
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value))}
            title="Indentation size"
            className="px-2 py-1 text-sm border border-border rounded-lg bg-background"
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
          <button
            onClick={loadSample}
            className="text-sm text-primary hover:underline"
          >
            Load sample
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Editor areas */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Input</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='{"key": "value"}'
            spellCheck={false}
            className="w-full h-80 p-4 font-mono text-sm bg-muted/50 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Output
            {output && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                {output.length.toLocaleString()} chars
              </span>
            )}
          </label>
          <textarea
            value={output}
            readOnly
            placeholder="Formatted JSON will appear here..."
            spellCheck={false}
            className="w-full h-80 p-4 font-mono text-sm bg-muted/50 border border-border rounded-lg resize-none focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
