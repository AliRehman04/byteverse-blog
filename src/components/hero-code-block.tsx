"use client";

import { useState, useEffect } from "react";

const codeLines = [
  { text: "const site = await ByteVerse.audit();", color: "text-blue-300" },
  { text: "", color: "" },
  { text: "// Publish only what passes", color: "text-slate-500" },
  { text: "site.check({", color: "text-slate-200" },
  { text: "  content: 'tested',", color: "text-emerald-400" },
  { text: "  links: 'clean',", color: "text-emerald-400" },
  { text: "  schema: 'valid',", color: "text-emerald-400" },
  { text: "  tools: 'client-side',", color: "text-emerald-400" },
  { text: "});", color: "text-slate-200" },
  { text: "", color: "" },
  { text: "site.deploy({", color: "text-violet-300" },
  { text: "  speed: 'optimized',", color: "text-amber-300" },
  { text: "  readerTrust: 'high',", color: "text-amber-300" },
  { text: "});", color: "text-violet-300" },
];

export function HeroCodeBlock() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines < codeLines.length) {
      const timeout = setTimeout(
        () => setVisibleLines((v) => v + 1),
        visibleLines === 0 ? 600 : 120
      );
      return () => clearTimeout(timeout);
    }
  }, [visibleLines]);

  return (
    <div className="relative">
      {/* Glow behind */}
      <div className="absolute -inset-4 bg-blue-500/10 rounded-3xl blur-2xl" />

      {/* Editor window */}
      <div className="relative rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[11px] text-slate-500 ml-2 font-mono">qa-dashboard.ts</span>
        </div>

        {/* Code content */}
        <div className="p-5 font-mono text-[13px] leading-6 min-h-[320px]">
          {codeLines.map((line, i) => (
            <div
              key={i}
              className={`transition-all duration-300 ${
                i < visibleLines
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2"
              }`}
            >
              <span className="text-slate-600 select-none mr-4 text-xs">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={line.color}>{line.text}</span>
              {i === visibleLines - 1 && visibleLines < codeLines.length && (
                <span className="inline-block w-[2px] h-4 bg-blue-400 ml-0.5 animate-pulse align-text-bottom" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Floating mini cards */}
      <div className="absolute -top-4 -right-4 animate-float" style={{ animationDelay: "0.5s" }}>
        <div className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-semibold text-emerald-300">QA Passed</span>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-3 -left-3 animate-float-reverse" style={{ animationDelay: "1s" }}>
        <div className="px-3 py-2 rounded-xl bg-blue-500/20 border border-blue-400/20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-blue-300">Fresh Guides</span>
          </div>
        </div>
      </div>
    </div>
  );
}
