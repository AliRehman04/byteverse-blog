"use client";

import { useState } from "react";
import { Sparkles, ChevronDown } from "lucide-react";

interface KeyTakeawaysProps {
  summary: string; // pipe-separated bullet points: "point 1|point 2|point 3"
}

export function KeyTakeaways({ summary }: KeyTakeawaysProps) {
  const [open, setOpen] = useState(false);
  const points = summary
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  if (points.length === 0) return null;

  return (
    <div className="mb-10 rounded-2xl overflow-hidden ring-1 ring-primary/20 shadow-lg shadow-primary/5">
      {/* Header — always visible, clickable */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:from-primary/15 transition-colors cursor-pointer"
        aria-expanded={open}
        aria-controls="key-takeaways-content"
      >
        <span className="flex items-center gap-2 text-sm font-bold tracking-wide uppercase text-primary">
          <Sparkles size={16} className="shrink-0" />
          Key Takeaways
        </span>
        <ChevronDown
          size={18}
          className={`text-primary transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Content — collapsible */}
      <div
        id="key-takeaways-content"
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <ul className="px-5 pt-1 pb-5 space-y-3">
            {points.map((point, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
