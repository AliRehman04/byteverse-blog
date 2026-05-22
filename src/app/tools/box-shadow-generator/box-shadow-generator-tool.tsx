"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Plus, Trash2, RotateCcw } from "lucide-react";

interface Shadow {
  id: number;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
  inset: boolean;
}

let sid = 1;

function createShadow(overrides?: Partial<Shadow>): Shadow {
  return { id: sid++, x: 4, y: 4, blur: 10, spread: 0, color: "#000000", opacity: 25, inset: false, ...overrides };
}

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${(opacity / 100).toFixed(2)})`;
}

export function BoxShadowGeneratorTool() {
  const [shadows, setShadows] = useState<Shadow[]>([createShadow()]);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [boxColor, setBoxColor] = useState("#ffffff");
  const [borderRadius, setBorderRadius] = useState(12);
  const [copied, setCopied] = useState(false);

  const cssValue = shadows
    .map((s) => {
      const parts = [s.inset ? "inset" : "", `${s.x}px`, `${s.y}px`, `${s.blur}px`, `${s.spread}px`, hexToRgba(s.color, s.opacity)];
      return parts.filter(Boolean).join(" ");
    })
    .join(",\n    ");

  const cssCode = `box-shadow: ${cssValue};`;

  const copyCSS = useCallback(async () => {
    await navigator.clipboard.writeText(cssCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [cssCode]);

  const updateShadow = (id: number, field: keyof Shadow, value: number | string | boolean) => {
    setShadows((s) => s.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  };

  const presets = [
    { name: "Subtle", shadows: [{ x: 0, y: 1, blur: 3, spread: 0, color: "#000000", opacity: 10, inset: false }] },
    { name: "Medium", shadows: [{ x: 0, y: 4, blur: 6, spread: -1, color: "#000000", opacity: 10, inset: false }, { x: 0, y: 2, blur: 4, spread: -2, color: "#000000", opacity: 10, inset: false }] },
    { name: "Large", shadows: [{ x: 0, y: 10, blur: 15, spread: -3, color: "#000000", opacity: 10, inset: false }, { x: 0, y: 4, blur: 6, spread: -4, color: "#000000", opacity: 10, inset: false }] },
    { name: "Elevated", shadows: [{ x: 0, y: 20, blur: 25, spread: -5, color: "#000000", opacity: 10, inset: false }, { x: 0, y: 8, blur: 10, spread: -6, color: "#000000", opacity: 10, inset: false }] },
    { name: "Inset", shadows: [{ x: 0, y: 2, blur: 4, spread: 0, color: "#000000", opacity: 15, inset: true }] },
    { name: "Neon", shadows: [{ x: 0, y: 0, blur: 20, spread: 2, color: "#6366f1", opacity: 60, inset: false }] },
  ];

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button key={p.name} onClick={() => setShadows(p.shadows.map((s) => ({ ...createShadow(), ...s })))} className="text-xs px-3 py-1.5 rounded-lg bg-muted/50 border border-border hover:bg-primary/10 hover:border-primary/50 transition-colors">
            {p.name}
          </button>
        ))}
        <button onClick={() => setShadows([createShadow()])} className="text-xs px-3 py-1.5 rounded-lg bg-muted/50 border border-border hover:bg-red-500/10 hover:border-red-500/50 transition-colors flex items-center gap-1 ml-auto">
          <RotateCcw size={11} /> Reset
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          {shadows.map((s, i) => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shadow {i + 1}</p>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={s.inset} onChange={(e) => updateShadow(s.id, "inset", e.target.checked)} className="rounded accent-primary" />
                    Inset
                  </label>
                  {shadows.length > 1 && (
                    <button onClick={() => setShadows(shadows.filter((x) => x.id !== s.id))} className="text-muted-foreground hover:text-red-500"><Trash2 size={13} /></button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">X Offset: {s.x}px</label>
                  <input type="range" min={-50} max={50} value={s.x} onChange={(e) => updateShadow(s.id, "x", Number(e.target.value))} className="w-full accent-primary" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Y Offset: {s.y}px</label>
                  <input type="range" min={-50} max={50} value={s.y} onChange={(e) => updateShadow(s.id, "y", Number(e.target.value))} className="w-full accent-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Blur: {s.blur}px</label>
                  <input type="range" min={0} max={100} value={s.blur} onChange={(e) => updateShadow(s.id, "blur", Number(e.target.value))} className="w-full accent-primary" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Spread: {s.spread}px</label>
                  <input type="range" min={-50} max={50} value={s.spread} onChange={(e) => updateShadow(s.id, "spread", Number(e.target.value))} className="w-full accent-primary" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="color" value={s.color} onChange={(e) => updateShadow(s.id, "color", e.target.value)} className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5 bg-muted/50" />
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground mb-1 block">Opacity: {s.opacity}%</label>
                  <input type="range" min={0} max={100} value={s.opacity} onChange={(e) => updateShadow(s.id, "opacity", Number(e.target.value))} className="w-full accent-primary" />
                </div>
              </div>
            </div>
          ))}

          <button onClick={() => setShadows([...shadows, createShadow()])} className="w-full py-2.5 rounded-xl border-2 border-dashed border-border hover:border-primary/50 text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5">
            <Plus size={14} /> Add Shadow Layer
          </button>

          {/* Box settings */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview Settings</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <input type="color" value={boxColor} onChange={(e) => setBoxColor(e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer p-0.5 bg-muted/50" />
                <span className="text-xs text-muted-foreground">Box</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer p-0.5 bg-muted/50" />
                <span className="text-xs text-muted-foreground">Background</span>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Radius: {borderRadius}px</label>
                <input type="range" min={0} max={50} value={borderRadius} onChange={(e) => setBorderRadius(Number(e.target.value))} className="w-full accent-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Preview & output */}
        <div className="space-y-4 sticky top-20 self-start">
          <div className="rounded-xl border border-border p-12 flex items-center justify-center" style={{ backgroundColor: bgColor, minHeight: 250 }}>
            <div className="w-48 h-48 rounded-md flex items-center justify-center text-xs text-muted-foreground" style={{ backgroundColor: boxColor, borderRadius: `${borderRadius}px`, boxShadow: cssValue }} />
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-sm font-medium">CSS Output</p>
              <button onClick={copyCSS} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap">{cssCode}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
