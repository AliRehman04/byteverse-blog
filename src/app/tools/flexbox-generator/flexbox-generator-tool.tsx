"use client";

import { useState, useCallback } from "react";
import { Copy, Check, RotateCcw } from "lucide-react";

interface FlexConfig {
  direction: string;
  justifyContent: string;
  alignItems: string;
  flexWrap: string;
  gap: number;
  itemCount: number;
}

const defaults: FlexConfig = {
  direction: "row",
  justifyContent: "flex-start",
  alignItems: "stretch",
  flexWrap: "nowrap",
  gap: 8,
  itemCount: 5,
};

const directions = ["row", "row-reverse", "column", "column-reverse"];
const justifyOptions = ["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"];
const alignOptions = ["stretch", "flex-start", "flex-end", "center", "baseline"];
const wrapOptions = ["nowrap", "wrap", "wrap-reverse"];

export function FlexboxGeneratorTool() {
  const [config, setConfig] = useState<FlexConfig>(defaults);
  const [copied, setCopied] = useState(false);

  const update = (key: keyof FlexConfig, value: string | number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const cssCode = `display: flex;
flex-direction: ${config.direction};
justify-content: ${config.justifyContent};
align-items: ${config.alignItems};
flex-wrap: ${config.flexWrap};
gap: ${config.gap}px;`;

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(cssCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [cssCode]);

  const reset = () => setConfig(defaults);

  return (
    <div className="space-y-8">
      {/* Controls + Preview */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Container Properties</h2>
            <button
              onClick={reset}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>

          {/* Direction */}
          <div>
            <label className="text-xs font-medium mb-2 block">flex-direction</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {directions.map((d) => (
                <button
                  key={d}
                  onClick={() => update("direction", d)}
                  className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                    config.direction === d
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border hover:border-primary/40"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Justify Content */}
          <div>
            <label className="text-xs font-medium mb-2 block">justify-content</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {justifyOptions.map((j) => (
                <button
                  key={j}
                  onClick={() => update("justifyContent", j)}
                  className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                    config.justifyContent === j
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border hover:border-primary/40"
                  }`}
                >
                  {j}
                </button>
              ))}
            </div>
          </div>

          {/* Align Items */}
          <div>
            <label className="text-xs font-medium mb-2 block">align-items</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {alignOptions.map((a) => (
                <button
                  key={a}
                  onClick={() => update("alignItems", a)}
                  className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                    config.alignItems === a
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border hover:border-primary/40"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Flex Wrap */}
          <div>
            <label className="text-xs font-medium mb-2 block">flex-wrap</label>
            <div className="grid grid-cols-3 gap-2">
              {wrapOptions.map((w) => (
                <button
                  key={w}
                  onClick={() => update("flexWrap", w)}
                  className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                    config.flexWrap === w
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border hover:border-primary/40"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Gap */}
          <div>
            <label className="text-xs font-medium mb-2 block">gap: {config.gap}px</label>
            <input
              type="range"
              min={0}
              max={48}
              step={4}
              value={config.gap}
              onChange={(e) => update("gap", parseInt(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Item Count */}
          <div>
            <label className="text-xs font-medium mb-2 block">Items: {config.itemCount}</label>
            <input
              type="range"
              min={1}
              max={12}
              step={1}
              value={config.itemCount}
              onChange={(e) => update("itemCount", parseInt(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </div>

        {/* Live Preview */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Live Preview</h2>
          <div
            className="min-h-[280px] border border-dashed border-border rounded-lg p-4 bg-muted/30"
            style={{
              display: "flex",
              flexDirection: config.direction as React.CSSProperties["flexDirection"],
              justifyContent: config.justifyContent,
              alignItems: config.alignItems,
              flexWrap: config.flexWrap as React.CSSProperties["flexWrap"],
              gap: `${config.gap}px`,
            }}
          >
            {Array.from({ length: config.itemCount }, (_, i) => (
              <div
                key={i}
                className="flex items-center justify-center rounded-lg bg-primary/80 text-primary-foreground font-semibold text-sm shadow-sm"
                style={{
                  minWidth: "48px",
                  minHeight: "48px",
                  padding: "12px 16px",
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Generated CSS */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Generated CSS</h2>
          <button
            onClick={copy}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy CSS"}
          </button>
        </div>
        <pre className="bg-muted/50 border border-border rounded-lg px-4 py-3 font-mono text-sm overflow-x-auto whitespace-pre">
          {cssCode}
        </pre>
      </div>
    </div>
  );
}
