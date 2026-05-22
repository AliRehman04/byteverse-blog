"use client";

import { useState, useCallback, useMemo } from "react";
import { Copy, Check } from "lucide-react";

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [Math.round(hue2rgb(p, q, h + 1 / 3) * 255), Math.round(hue2rgb(p, q, h) * 255), Math.round(hue2rgb(p, q, h - 1 / 3) * 255)];
}

export function ColorConverterTool() {
  const [hex, setHex] = useState("#6366f1");
  const [r, setR] = useState(99);
  const [g, setG] = useState(102);
  const [b, setB] = useState(241);
  const [h, setH] = useState(239);
  const [s, setS] = useState(84);
  const [l, setL] = useState(67);
  const [copied, setCopied] = useState("");

  const syncFromHex = (val: string) => {
    setHex(val);
    const rgb = hexToRgb(val);
    if (rgb) {
      setR(rgb[0]); setG(rgb[1]); setB(rgb[2]);
      const [hh, ss, ll] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
      setH(hh); setS(ss); setL(ll);
    }
  };

  const syncFromRgb = (nr: number, ng: number, nb: number) => {
    setR(nr); setG(ng); setB(nb);
    setHex(rgbToHex(nr, ng, nb));
    const [hh, ss, ll] = rgbToHsl(nr, ng, nb);
    setH(hh); setS(ss); setL(ll);
  };

  const syncFromHsl = (nh: number, ns: number, nl: number) => {
    setH(nh); setS(ns); setL(nl);
    const [nr, ng, nb] = hslToRgb(nh, ns, nl);
    setR(nr); setG(ng); setB(nb);
    setHex(rgbToHex(nr, ng, nb));
  };

  const copy = useCallback(async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }, []);

  const hexStr = hex.toUpperCase();
  const rgbStr = `rgb(${r}, ${g}, ${b})`;
  const hslStr = `hsl(${h}, ${s}%, ${l}%)`;

  const contrastColor = l > 50 ? "#000000" : "#ffffff";

  // Named colors lookup (common ones)
  const namedColor = useMemo(() => {
    const names: Record<string, string> = {
      "#FF0000": "Red", "#00FF00": "Lime", "#0000FF": "Blue", "#FFFFFF": "White", "#000000": "Black",
      "#FFFF00": "Yellow", "#00FFFF": "Cyan", "#FF00FF": "Magenta", "#808080": "Gray",
      "#800000": "Maroon", "#808000": "Olive", "#008000": "Green", "#800080": "Purple",
      "#008080": "Teal", "#000080": "Navy", "#FFA500": "Orange", "#FFC0CB": "Pink",
      "#A52A2A": "Brown", "#DDA0DD": "Plum", "#F0E68C": "Khaki", "#E6E6FA": "Lavender",
    };
    return names[hexStr] || null;
  }, [hexStr]);

  const inp = "bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Color preview */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="h-32 flex items-center justify-center text-lg font-bold" style={{ backgroundColor: hex, color: contrastColor }}>
          {hexStr}
        </div>
      </div>

      {/* Color picker */}
      <div className="flex justify-center">
        <input type="color" value={hex} onChange={(e) => syncFromHex(e.target.value)} className="w-16 h-16 rounded-xl border-2 border-border cursor-pointer p-1 bg-muted/50" />
      </div>

      {/* HEX */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">HEX</label>
          <button onClick={() => copy(hexStr, "hex")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            {copied === "hex" ? <Check size={12} /> : <Copy size={12} />}
            {copied === "hex" ? "Copied" : "Copy"}
          </button>
        </div>
        <input value={hex} onChange={(e) => syncFromHex(e.target.value)} placeholder="#6366f1" className={inp + " w-full"} />
      </div>

      {/* RGB */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">RGB</label>
          <button onClick={() => copy(rgbStr, "rgb")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            {copied === "rgb" ? <Check size={12} /> : <Copy size={12} />}
            {copied === "rgb" ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">R (0-255)</label>
            <input type="number" min={0} max={255} value={r} onChange={(e) => syncFromRgb(Number(e.target.value), g, b)} className={inp + " w-full"} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">G (0-255)</label>
            <input type="number" min={0} max={255} value={g} onChange={(e) => syncFromRgb(r, Number(e.target.value), b)} className={inp + " w-full"} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">B (0-255)</label>
            <input type="number" min={0} max={255} value={b} onChange={(e) => syncFromRgb(r, g, Number(e.target.value))} className={inp + " w-full"} />
          </div>
        </div>
        <input type="range" min={0} max={255} value={r} onChange={(e) => syncFromRgb(Number(e.target.value), g, b)} className="w-full accent-red-500" />
        <input type="range" min={0} max={255} value={g} onChange={(e) => syncFromRgb(r, Number(e.target.value), b)} className="w-full accent-green-500" />
        <input type="range" min={0} max={255} value={b} onChange={(e) => syncFromRgb(r, g, Number(e.target.value))} className="w-full accent-blue-500" />
      </div>

      {/* HSL */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">HSL</label>
          <button onClick={() => copy(hslStr, "hsl")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            {copied === "hsl" ? <Check size={12} /> : <Copy size={12} />}
            {copied === "hsl" ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">H (0-360)</label>
            <input type="number" min={0} max={360} value={h} onChange={(e) => syncFromHsl(Number(e.target.value), s, l)} className={inp + " w-full"} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">S (0-100)</label>
            <input type="number" min={0} max={100} value={s} onChange={(e) => syncFromHsl(h, Number(e.target.value), l)} className={inp + " w-full"} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">L (0-100)</label>
            <input type="number" min={0} max={100} value={l} onChange={(e) => syncFromHsl(h, s, Number(e.target.value))} className={inp + " w-full"} />
          </div>
        </div>
        <input type="range" min={0} max={360} value={h} onChange={(e) => syncFromHsl(Number(e.target.value), s, l)} className="w-full accent-primary" />
        <input type="range" min={0} max={100} value={s} onChange={(e) => syncFromHsl(h, Number(e.target.value), l)} className="w-full accent-primary" />
        <input type="range" min={0} max={100} value={l} onChange={(e) => syncFromHsl(h, s, Number(e.target.value))} className="w-full accent-primary" />
      </div>

      {/* Summary */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">All Formats</p>
        <div className="space-y-2 font-mono text-sm">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">HEX:</span><span>{hexStr}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">RGB:</span><span>{rgbStr}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">HSL:</span><span>{hslStr}</span></div>
          {namedColor && <div className="flex items-center justify-between"><span className="text-muted-foreground">Name:</span><span>{namedColor}</span></div>}
        </div>
      </div>
    </div>
  );
}
