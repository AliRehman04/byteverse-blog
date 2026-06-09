"use client";

import { useState, useCallback } from "react";
import { Copy, Check, ArrowRight, Upload, Download } from "lucide-react";

function jsonToCsv(jsonStr: string, delimiter: string): { csv: string; error: string | null } {
  try {
    const parsed = JSON.parse(jsonStr);
    const arr = Array.isArray(parsed) ? parsed : [parsed];

    if (arr.length === 0) return { csv: "", error: "Empty array" };

    // Flatten nested objects
    const flatArr = arr.map((item) => flattenObject(item));

    // Collect all keys
    const keySet = new Set<string>();
    for (const obj of flatArr) {
      for (const key of Object.keys(obj)) {
        keySet.add(key);
      }
    }
    const headers = Array.from(keySet);

    // Build CSV
    const escapeField = (val: unknown): string => {
      if (val === null || val === undefined) return "";
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      if (str.includes(delimiter) || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = [
      headers.map((h) => escapeField(h)).join(delimiter),
      ...flatArr.map((obj) =>
        headers.map((h) => escapeField(obj[h])).join(delimiter)
      ),
    ];

    return { csv: lines.join("\n"), error: null };
  } catch (e) {
    return { csv: "", error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}

function flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

const SAMPLE = `[
  { "name": "Alice", "age": 30, "email": "alice@example.com", "role": "Developer" },
  { "name": "Bob", "age": 25, "email": "bob@example.com", "role": "Designer" },
  { "name": "Charlie", "age": 35, "email": "charlie@example.com", "role": "Manager" }
]`;

export function JsonToCsvTool() {
  const [input, setInput] = useState("");
  const [delimiter, setDelimiter] = useState(",");
  const [copied, setCopied] = useState(false);

  const { csv, error } = input.trim() ? jsonToCsv(input, delimiter) : { csv: "", error: null };

  const copy = useCallback(async () => {
    if (!csv) return;
    await navigator.clipboard.writeText(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [csv]);

  const downloadCsv = useCallback(() => {
    if (!csv) return;
    const ext = delimiter === "\t" ? "tsv" : "csv";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [csv, delimiter]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") setInput(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const rowCount = csv ? csv.split("\n").length - 1 : 0;
  const colCount = csv ? (csv.split("\n")[0]?.split(delimiter).length || 0) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">JSON Input</label>
            <div className="flex gap-2">
              <label className="text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1 transition-colors">
                <Upload size={12} /> Upload
                <input type="file" accept=".json" onChange={handleFile} className="hidden" />
              </label>
              <button
                onClick={() => setInput(SAMPLE)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Load sample
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={18}
            placeholder='Paste JSON array here, e.g. [{"name":"Alice","age":30}]'
            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none leading-relaxed"
            spellCheck={false}
            autoFocus
          />
          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}
        </div>

        {/* Arrow (mobile) */}
        <div className="flex justify-center text-muted-foreground lg:hidden">
          <ArrowRight className="rotate-90" size={20} />
        </div>

        {/* Output */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">CSV Output</label>
            <div className="flex gap-2">
              <button
                onClick={copy}
                disabled={!csv}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors disabled:opacity-40"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={downloadCsv}
                disabled={!csv}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors disabled:opacity-40"
              >
                <Download size={12} /> Download
              </button>
            </div>
          </div>
          <pre className="bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm font-mono min-h-[26rem] max-h-[26rem] overflow-auto whitespace-pre-wrap break-all leading-relaxed">
            {csv || <span className="text-muted-foreground">CSV output will appear here...</span>}
          </pre>
          {csv && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{rowCount} rows</span>
              <span>{colCount} columns</span>
            </div>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="text-xs font-medium mb-1 block">Delimiter</label>
            <select
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
              className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value=",">Comma (,)</option>
              <option value=";">Semicolon (;)</option>
              <option value={"\t"}>Tab</option>
              <option value="|">Pipe (|)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
