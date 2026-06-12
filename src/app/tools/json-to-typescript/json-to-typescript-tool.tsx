"use client";

import { useState, useCallback } from "react";
import { Copy, Check, ArrowRight, Upload, Download, RotateCcw } from "lucide-react";

/* ── Core Converter ── */

interface ConvertOptions {
  rootName: string;
  useType: boolean; // true = type, false = interface
  optional: boolean; // make all props optional
  readonly: boolean;
  exportDecl: boolean;
}

function jsonToTs(jsonStr: string, opts: ConvertOptions): { ts: string; error: string | null } {
  try {
    const parsed = JSON.parse(jsonStr);
    const interfaces: string[] = [];
    const seen = new Map<string, string>();

    function capitalize(s: string): string {
      return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function sanitize(key: string): string {
      return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
    }

    function getType(value: unknown, name: string): string {
      if (value === null) return "null";
      if (value === undefined) return "undefined";
      if (typeof value === "string") return "string";
      if (typeof value === "number") return Number.isInteger(value) ? "number" : "number";
      if (typeof value === "boolean") return "boolean";
      if (Array.isArray(value)) {
        if (value.length === 0) return "unknown[]";
        const types = new Set(value.map((item, i) => getType(item, `${name}Item`)));
        if (types.size === 1) return `${[...types][0]}[]`;
        return `(${[...types].join(" | ")})[]`;
      }
      if (typeof value === "object") {
        const typeName = capitalize(name);
        generateInterface(value as Record<string, unknown>, typeName);
        return typeName;
      }
      return "unknown";
    }

    function generateInterface(obj: Record<string, unknown>, name: string) {
      const sig = JSON.stringify(Object.keys(obj).sort());
      if (seen.has(name) && seen.get(name) === sig) return;
      seen.set(name, sig);

      const keyword = opts.useType ? "type" : "interface";
      const exp = opts.exportDecl ? "export " : "";
      const readonlyPfx = opts.readonly ? "readonly " : "";
      const optSuffix = opts.optional ? "?" : "";

      const lines: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        const propType = getType(value, key);
        lines.push(`  ${readonlyPfx}${sanitize(key)}${optSuffix}: ${propType};`);
      }

      if (opts.useType) {
        interfaces.push(`${exp}type ${name} = {\n${lines.join("\n")}\n};`);
      } else {
        interfaces.push(`${exp}interface ${name} {\n${lines.join("\n")}\n}`);
      }
    }

    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return { ts: `type ${opts.rootName} = unknown[];`, error: null };
      }
      const first = parsed[0];
      if (typeof first === "object" && first !== null && !Array.isArray(first)) {
        // Merge all keys from all items for a complete interface
        const merged: Record<string, unknown> = {};
        for (const item of parsed) {
          if (typeof item === "object" && item !== null) {
            for (const [k, v] of Object.entries(item)) {
              if (!(k in merged)) merged[k] = v;
            }
          }
        }
        generateInterface(merged, opts.rootName);
      } else {
        const itemType = getType(first, `${opts.rootName}Item`);
        interfaces.push(`type ${opts.rootName}List = ${itemType}[];`);
      }
    } else if (typeof parsed === "object") {
      generateInterface(parsed as Record<string, unknown>, opts.rootName);
    } else {
      return { ts: `type ${opts.rootName} = ${typeof parsed};`, error: null };
    }

    return { ts: interfaces.join("\n\n"), error: null };
  } catch (e) {
    return { ts: "", error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}

/* ── UI Component ── */

const SAMPLE_JSON = `{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "isActive": true,
  "age": 30,
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "zipCode": "10001"
  },
  "tags": ["developer", "blogger"],
  "scores": [95, 88, 72]
}`;

export function JsonToTypeScriptTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rootName, setRootName] = useState("Root");
  const [useType, setUseType] = useState(false);
  const [optional, setOptional] = useState(false);
  const [readonly, setReadonly] = useState(false);
  const [exportDecl, setExportDecl] = useState(true);

  const convert = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError("Paste some JSON first");
      return;
    }
    const { ts, error: err } = jsonToTs(input, { rootName, useType, optional, readonly, exportDecl });
    setOutput(ts);
    setError(err);
  }, [input, rootName, useType, optional, readonly, exportDecl]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleDownload = useCallback(() => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rootName.toLowerCase()}.d.ts`;
    a.click();
    URL.revokeObjectURL(url);
  }, [output, rootName]);

  const handleLoadSample = useCallback(() => {
    setInput(SAMPLE_JSON);
    setError(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Options Bar */}
      <div className="flex flex-wrap gap-4 items-center p-4 rounded-xl bg-muted/50 border border-border">
        <div className="flex items-center gap-2">
          <label htmlFor="rootName" className="text-sm font-medium">Root Name:</label>
          <input
            id="rootName"
            type="text"
            value={rootName}
            onChange={(e) => setRootName(e.target.value || "Root")}
            className="w-28 px-2 py-1 text-sm rounded-lg border border-border bg-background"
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={useType} onChange={(e) => setUseType(e.target.checked)} className="accent-primary" />
          Use <code className="bg-muted px-1 rounded text-xs">type</code> instead of <code className="bg-muted px-1 rounded text-xs">interface</code>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={exportDecl} onChange={(e) => setExportDecl(e.target.checked)} className="accent-primary" />
          Export
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={optional} onChange={(e) => setOptional(e.target.checked)} className="accent-primary" />
          Optional props
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={readonly} onChange={(e) => setReadonly(e.target.checked)} className="accent-primary" />
          Readonly
        </label>
      </div>

      {/* Editors */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">JSON Input</h2>
            <div className="flex items-center gap-2">
              <button onClick={handleLoadSample} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Load Sample
              </button>
              <label className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Upload size={12} /> Upload
                <input type="file" accept=".json" onChange={handleUpload} className="hidden" />
              </label>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Paste your JSON here...'
            className="w-full h-80 p-4 font-mono text-sm rounded-xl border border-border bg-background resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">TypeScript Output</h2>
            <div className="flex items-center gap-2">
              {output && (
                <>
                  <button onClick={handleCopy} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                  <button onClick={handleDownload} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    <Download size={12} /> Download .d.ts
                  </button>
                </>
              )}
            </div>
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="TypeScript interfaces will appear here..."
            className="w-full h-80 p-4 font-mono text-sm rounded-xl border border-border bg-muted/30 resize-none outline-none"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Convert Button */}
      <div className="flex items-center gap-3 justify-center">
        <button
          onClick={convert}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
        >
          Convert <ArrowRight size={16} />
        </button>
        <button
          onClick={() => { setInput(""); setOutput(""); setError(null); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-muted text-foreground font-medium rounded-xl hover:bg-muted/70 transition-colors"
        >
          <RotateCcw size={14} /> Clear
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm font-medium">
          {error}
        </div>
      )}
    </div>
  );
}
