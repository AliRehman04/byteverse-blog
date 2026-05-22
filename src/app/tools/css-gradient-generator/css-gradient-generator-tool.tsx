"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Copy, Check, Plus, Trash2, RotateCcw } from "lucide-react";

interface ColorStop {
  id: number;
  color: string;
  position: number;
}

let nid = 1;

export function CssGradientGeneratorTool() {
  const [type, setType] = useState<"linear" | "radial">("linear");
  const [angle, setAngle] = useState(90);
  const [radialShape, setRadialShape] = useState<"circle" | "ellipse">("circle");
  const [radialPosition, setRadialPosition] = useState("center");
  const [stops, setStops] = useState<ColorStop[]>([
    { id: nid++, color: "#6366f1", position: 0 },
    { id: nid++, color: "#ec4899", position: 100 },
  ]);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const gradient = (() => {
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    const stopsStr = sorted.map((s) => `${s.color} ${s.position}%`).join(", ");
    if (type === "linear") return `linear-gradient(${angle}deg, ${stopsStr})`;
    return `radial-gradient(${radialShape} at ${radialPosition}, ${stopsStr})`;
  })();

  const cssCode = `background: ${gradient};`;

  const copyCSS = useCallback(async () => {
    await navigator.clipboard.writeText(cssCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [cssCode]);

  const addStop = () => {
    const pos = stops.length > 0 ? Math.round((stops[stops.length - 1].position + stops[0].position) / 2) : 50;
    setStops([...stops, { id: nid++, color: "#8b5cf6", position: pos }]);
  };

  const updateStop = (id: number, field: keyof ColorStop, value: string | number) => {
    setStops(stops.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeStop = (id: number) => {
    if (stops.length > 2) setStops(stops.filter((s) => s.id !== id));
  };

  const presets = [
    { name: "Sunset", stops: [{ color: "#f97316", pos: 0 }, { color: "#ec4899", pos: 50 }, { color: "#8b5cf6", pos: 100 }], angle: 135 },
    { name: "Ocean", stops: [{ color: "#06b6d4", pos: 0 }, { color: "#3b82f6", pos: 100 }], angle: 135 },
    { name: "Forest", stops: [{ color: "#22c55e", pos: 0 }, { color: "#14b8a6", pos: 100 }], angle: 135 },
    { name: "Fire", stops: [{ color: "#ef4444", pos: 0 }, { color: "#f97316", pos: 50 }, { color: "#eab308", pos: 100 }], angle: 90 },
    { name: "Night", stops: [{ color: "#1e1b4b", pos: 0 }, { color: "#312e81", pos: 50 }, { color: "#4338ca", pos: 100 }], angle: 180 },
    { name: "Candy", stops: [{ color: "#f472b6", pos: 0 }, { color: "#c084fc", pos: 50 }, { color: "#60a5fa", pos: 100 }], angle: 90 },
  ];

  const applyPreset = (p: (typeof presets)[0]) => {
    setStops(p.stops.map((s) => ({ id: nid++, color: s.color, position: s.pos })));
    setAngle(p.angle);
    setType("linear");
  };

  // Keyboard shortcuts for angle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (type !== "linear") return;
      if (e.key === "ArrowLeft") setAngle((a) => (a - 15 + 360) % 360);
      if (e.key === "ArrowRight") setAngle((a) => (a + 15) % 360);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [type]);

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button key={p.name} onClick={() => applyPreset(p)} className="text-xs px-3 py-1.5 rounded-lg bg-muted/50 border border-border hover:bg-primary/10 hover:border-primary/50 transition-colors">
            {p.name}
          </button>
        ))}
        <button onClick={() => { setStops([{ id: nid++, color: "#6366f1", position: 0 }, { id: nid++, color: "#ec4899", position: 100 }]); setAngle(90); setType("linear"); }} className="text-xs px-3 py-1.5 rounded-lg bg-muted/50 border border-border hover:bg-red-500/10 hover:border-red-500/50 transition-colors flex items-center gap-1 ml-auto">
          <RotateCcw size={11} /> Reset
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          {/* Type & direction */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setType("linear")} className={`text-xs px-4 py-1.5 rounded-lg border transition-colors ${type === "linear" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-border"}`}>Linear</button>
              <button onClick={() => setType("radial")} className={`text-xs px-4 py-1.5 rounded-lg border transition-colors ${type === "radial" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-border"}`}>Radial</button>
            </div>

            {type === "linear" ? (
              <div>
                <label className="text-xs font-medium mb-1 block">Angle: {angle}°</label>
                <input type="range" min="0" max="360" value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="w-full accent-primary" />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                    <button key={a} onClick={() => setAngle(a)} className={`text-[10px] px-2 py-1 rounded border transition-colors ${angle === a ? "bg-primary/20 border-primary/50" : "bg-muted/30 border-border"}`}>{a}°</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Shape</label>
                  <select value={radialShape} onChange={(e) => setRadialShape(e.target.value as "circle" | "ellipse")} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    <option value="circle">Circle</option>
                    <option value="ellipse">Ellipse</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Position</label>
                  <select value={radialPosition} onChange={(e) => setRadialPosition(e.target.value)} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    <option value="center">Center</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="top left">Top Left</option>
                    <option value="top right">Top Right</option>
                    <option value="bottom left">Bottom Left</option>
                    <option value="bottom right">Bottom Right</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Color stops */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Color Stops</p>
            {stops.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <input type="color" value={s.color} onChange={(e) => updateStop(s.id, "color", e.target.value)} className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5 bg-muted/50" />
                <input value={s.color} onChange={(e) => updateStop(s.id, "color", e.target.value)} className="w-24 bg-muted/50 border border-border rounded-lg px-2 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="range" min="0" max="100" value={s.position} onChange={(e) => updateStop(s.id, "position", Number(e.target.value))} className="flex-1 accent-primary" />
                <span className="text-xs text-muted-foreground w-8 text-right">{s.position}%</span>
                {stops.length > 2 && (
                  <button onClick={() => removeStop(s.id)} className="text-muted-foreground hover:text-red-500 p-1"><Trash2 size={13} /></button>
                )}
              </div>
            ))}
            <button onClick={addStop} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={12} /> Add Color Stop</button>
          </div>
        </div>

        {/* Preview & output */}
        <div className="space-y-4 sticky top-20 self-start">
          <div ref={previewRef} className="w-full aspect-video rounded-xl border border-border" style={{ background: gradient }} />

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
