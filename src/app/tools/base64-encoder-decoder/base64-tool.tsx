"use client";

import { useState, useCallback } from "react";
import { Copy, Check, ArrowDownUp } from "lucide-react";

export function Base64Tool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const process = useCallback(() => {
    if (!input.trim()) {
      setError("Please enter some text");
      setOutput("");
      return;
    }
    try {
      if (mode === "encode") {
        setOutput(btoa(unescape(encodeURIComponent(input))));
      } else {
        setOutput(decodeURIComponent(escape(atob(input.trim()))));
      }
      setError("");
    } catch {
      setError(mode === "encode" ? "Failed to encode" : "Invalid Base64 string");
      setOutput("");
    }
  }, [input, mode]);

  const swap = useCallback(() => {
    if (output) {
      setInput(output);
      setOutput("");
      setMode(mode === "encode" ? "decode" : "encode");
      setError("");
    } else {
      setMode(mode === "encode" ? "decode" : "encode");
    }
  }, [output, mode]);

  const copyOutput = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-3">
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => { setMode("encode"); setOutput(""); setError(""); }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === "encode"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            }`}
          >
            Encode
          </button>
          <button
            onClick={() => { setMode("decode"); setOutput(""); setError(""); }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === "decode"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            }`}
          >
            Decode
          </button>
        </div>

        <button
          onClick={swap}
          className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
          title="Swap input/output"
        >
          <ArrowDownUp size={16} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Input */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          {mode === "encode" ? "Text to encode" : "Base64 to decode"}
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === "encode" ? "Enter text to encode..." : "Enter Base64 string to decode..."}
          rows={6}
          spellCheck={false}
          className="w-full p-4 font-mono text-sm bg-muted/50 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Action button */}
      <button
        onClick={process}
        className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
      >
        {mode === "encode" ? "Encode to Base64" : "Decode from Base64"}
      </button>

      {/* Output */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-sm font-medium">
            {mode === "encode" ? "Base64 Output" : "Decoded Text"}
          </label>
          {output && (
            <button
              onClick={copyOutput}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
        <textarea
          value={output}
          readOnly
          placeholder="Result will appear here..."
          rows={6}
          spellCheck={false}
          className="w-full p-4 font-mono text-sm bg-muted/50 border border-border rounded-lg resize-none focus:outline-none"
        />
      </div>
    </div>
  );
}
