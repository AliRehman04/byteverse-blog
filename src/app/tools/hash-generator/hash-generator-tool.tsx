"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Hash, Loader2, Trash2 } from "lucide-react";

const ALGORITHMS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
type Algorithm = (typeof ALGORITHMS)[number];

async function computeHash(text: string, algo: Algorithm): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algo, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function HashGeneratorTool() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<Record<Algorithm, string>>({
    "SHA-1": "",
    "SHA-256": "",
    "SHA-384": "",
    "SHA-512": "",
  });
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState("");
  const [uppercase, setUppercase] = useState(false);

  const generateHashes = useCallback(async (text: string) => {
    if (!text) {
      setResults({ "SHA-1": "", "SHA-256": "", "SHA-384": "", "SHA-512": "" });
      return;
    }
    setLoading(true);
    try {
      const hashes = await Promise.all(
        ALGORITHMS.map(async (algo) => {
          const hash = await computeHash(text, algo);
          return [algo, hash] as const;
        })
      );
      setResults(Object.fromEntries(hashes) as Record<Algorithm, string>);
    } catch {
      // Web Crypto not available
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = useCallback(
    (val: string) => {
      setInput(val);
      generateHashes(val);
    },
    [generateHashes]
  );

  const copyHash = useCallback(async (hash: string, algo: string) => {
    const text = hash;
    await navigator.clipboard.writeText(text);
    setCopiedField(algo);
    setTimeout(() => setCopiedField(""), 2000);
  }, []);

  const copyAll = useCallback(async () => {
    const lines = ALGORITHMS.filter((a) => results[a])
      .map((a) => {
        const h = uppercase ? results[a].toUpperCase() : results[a];
        return `${a}: ${h}`;
      })
      .join("\n");
    await navigator.clipboard.writeText(lines);
    setCopiedField("all");
    setTimeout(() => setCopiedField(""), 2000);
  }, [results, uppercase]);

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="hash-input" className="text-sm font-medium">
            Input Text
          </label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => setUppercase(e.target.checked)}
                className="rounded border-border"
              />
              Uppercase
            </label>
            <button
              onClick={() => handleInput("")}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>
        </div>
        <textarea
          id="hash-input"
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Enter text to hash..."
          rows={5}
          className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
          spellCheck={false}
        />
        {input && (
          <p className="text-xs text-muted-foreground mt-1">
            {new TextEncoder().encode(input).length} bytes •{" "}
            {input.length} characters
          </p>
        )}
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
          <Loader2 size={16} className="animate-spin" /> Computing hashes...
        </div>
      )}

      {input && !loading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium flex items-center gap-2">
              <Hash size={16} className="text-primary" />
              Hash Results
            </p>
            <button
              onClick={copyAll}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
            >
              {copiedField === "all" ? <Check size={12} /> : <Copy size={12} />}
              {copiedField === "all" ? "Copied All" : "Copy All"}
            </button>
          </div>

          {ALGORITHMS.map((algo) => (
            <div key={algo} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{algo}</span>
                <button
                  onClick={() =>
                    copyHash(
                      uppercase ? results[algo].toUpperCase() : results[algo],
                      algo
                    )
                  }
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {copiedField === algo ? (
                    <Check size={12} />
                  ) : (
                    <Copy size={12} />
                  )}
                  {copiedField === algo ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="bg-muted/50 border border-border rounded-lg p-2.5 font-mono text-xs break-all select-all">
                {uppercase ? results[algo].toUpperCase() : results[algo]}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {results[algo].length * 4} bits ({results[algo].length} hex chars)
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-medium mb-3">Algorithm Comparison</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 pr-4 text-muted-foreground font-medium">Algorithm</th>
                <th className="pb-2 pr-4 text-muted-foreground font-medium">Output</th>
                <th className="pb-2 pr-4 text-muted-foreground font-medium">Security</th>
                <th className="pb-2 text-muted-foreground font-medium">Use Case</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4 font-mono">SHA-1</td>
                <td className="py-2 pr-4">160 bits</td>
                <td className="py-2 pr-4 text-yellow-500">Weak</td>
                <td className="py-2">Legacy systems, checksums (not for security)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4 font-mono">SHA-256</td>
                <td className="py-2 pr-4">256 bits</td>
                <td className="py-2 pr-4 text-green-500">Strong</td>
                <td className="py-2">Most common — TLS, blockchain, digital signatures</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4 font-mono">SHA-384</td>
                <td className="py-2 pr-4">384 bits</td>
                <td className="py-2 pr-4 text-green-500">Strong</td>
                <td className="py-2">Government/enterprise systems</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono">SHA-512</td>
                <td className="py-2 pr-4">512 bits</td>
                <td className="py-2 pr-4 text-green-500">Strong</td>
                <td className="py-2">Maximum security, large data integrity</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
