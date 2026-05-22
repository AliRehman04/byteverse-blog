"use client";

import { useState, useCallback, useMemo } from "react";
import { Copy, Check, ArrowLeftRight, Trash2 } from "lucide-react";

export function UrlEncoderDecoderTool() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [encodeType, setEncodeType] = useState<"component" | "full">(
    "component"
  );
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    if (!input) return "";
    try {
      if (mode === "encode") {
        return encodeType === "component"
          ? encodeURIComponent(input)
          : encodeURI(input);
      } else {
        return encodeType === "component"
          ? decodeURIComponent(input)
          : decodeURI(input);
      }
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : "Invalid input"}`;
    }
  }, [input, mode, encodeType]);

  const isError = output.startsWith("Error:");

  const copyOutput = useCallback(async () => {
    if (isError || !output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output, isError]);

  const swap = useCallback(() => {
    if (isError || !output) return;
    setInput(output);
    setMode((m) => (m === "encode" ? "decode" : "encode"));
  }, [output, isError]);

  // URL parser
  const [parseUrl, setParseUrl] = useState("");
  const parsedParts = useMemo(() => {
    if (!parseUrl.trim()) return null;
    try {
      const u = new URL(parseUrl.trim());
      const params: [string, string][] = [];
      u.searchParams.forEach((v, k) => params.push([k, v]));
      return {
        href: u.href,
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || "(default)",
        pathname: u.pathname,
        search: u.search || "(none)",
        hash: u.hash || "(none)",
        origin: u.origin,
        params,
      };
    } catch {
      return { error: "Invalid URL" };
    }
  }, [parseUrl]);

  return (
    <div className="space-y-6">
      {/* Mode + type toggle */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          <button
            onClick={() => setMode("encode")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "encode"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Encode
          </button>
          <button
            onClick={() => setMode("decode")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "decode"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Decode
          </button>
        </div>

        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          <button
            onClick={() => setEncodeType("component")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              encodeType === "component"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="encodeURIComponent / decodeURIComponent — encodes all special characters"
          >
            Component
          </button>
          <button
            onClick={() => setEncodeType("full")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              encodeType === "full"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="encodeURI / decodeURI — preserves URL structure characters (:, /, ?, #, etc.)"
          >
            Full URI
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="url-input" className="text-sm font-medium">
            {mode === "encode" ? "Text to Encode" : "Encoded Text to Decode"}
          </label>
          <button
            onClick={() => setInput("")}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>
        <textarea
          id="url-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            mode === "encode"
              ? "Enter text or URL to encode..."
              : "Enter encoded text to decode (e.g. Hello%20World)..."
          }
          rows={4}
          className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
          spellCheck={false}
        />
      </div>

      {/* Swap button */}
      {output && !isError && (
        <div className="flex justify-center">
          <button
            onClick={swap}
            className="p-2 rounded-full bg-muted/50 border border-border hover:bg-primary/10 hover:border-primary/50 transition-colors"
            title="Swap input and output"
          >
            <ArrowLeftRight size={16} />
          </button>
        </div>
      )}

      {/* Output */}
      {input && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              {mode === "encode" ? "Encoded" : "Decoded"} Result
            </label>
            {!isError && (
              <button
                onClick={copyOutput}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
          <div
            className={`bg-muted/50 border rounded-lg p-3 font-mono text-sm whitespace-pre-wrap break-all ${
              isError
                ? "border-red-500/30 text-red-500"
                : "border-border"
            }`}
          >
            {output}
          </div>
          {!isError && (
            <p className="text-xs text-muted-foreground mt-1">
              Using {mode === "encode" ? "encode" : "decode"}
              {encodeType === "component" ? "URIComponent" : "URI"}()
            </p>
          )}
        </div>
      )}

      {/* Common encoded characters reference */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-medium mb-3">Common URL Encodings</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs font-mono">
          {[
            ["Space", "%20", " "],
            ["!", "%21", "!"],
            ["#", "%23", "#"],
            ["$", "%24", "$"],
            ["%", "%25", "%"],
            ["&", "%26", "&"],
            ["+", "%2B", "+"],
            ["/", "%2F", "/"],
            [":", "%3A", ":"],
            ["=", "%3D", "="],
            ["?", "%3F", "?"],
            ["@", "%40", "@"],
          ].map(([char, encoded]) => (
            <div
              key={char}
              className="flex justify-between bg-muted/50 px-2 py-1.5 rounded-lg"
            >
              <span className="text-foreground">{char}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-primary">{encoded}</span>
            </div>
          ))}
        </div>
      </div>

      {/* URL Parser */}
      <div className="bg-card border border-border rounded-xl p-5">
        <label htmlFor="url-parse-input" className="text-sm font-medium block mb-2">
          URL Parser (Bonus)
        </label>
        <input
          id="url-parse-input"
          type="text"
          value={parseUrl}
          onChange={(e) => setParseUrl(e.target.value)}
          placeholder="Paste a full URL to parse its components..."
          className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
          spellCheck={false}
        />
        {parsedParts && !("error" in parsedParts) && (
          <div className="mt-3 space-y-1.5 text-sm">
            {(
              [
                ["Protocol", parsedParts.protocol],
                ["Hostname", parsedParts.hostname],
                ["Port", parsedParts.port],
                ["Path", parsedParts.pathname],
                ["Query", parsedParts.search],
                ["Hash", parsedParts.hash],
                ["Origin", parsedParts.origin],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex gap-2 bg-muted/50 px-3 py-1.5 rounded-lg"
              >
                <span className="text-muted-foreground min-w-[80px]">
                  {label}:
                </span>
                <span className="font-mono text-xs break-all">{value}</span>
              </div>
            ))}
            {parsedParts.params.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Query Parameters
                </p>
                {parsedParts.params.map(([k, v], i) => (
                  <div
                    key={i}
                    className="flex gap-2 bg-muted/50 px-3 py-1.5 rounded-lg mb-1"
                  >
                    <span className="text-primary font-mono text-xs">{k}</span>
                    <span className="text-muted-foreground">=</span>
                    <span className="font-mono text-xs break-all">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {parsedParts && "error" in parsedParts && (
          <p className="text-xs text-red-500 mt-2">{parsedParts.error}</p>
        )}
      </div>
    </div>
  );
}
