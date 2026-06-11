"use client";

import { useState, useEffect, useCallback } from "react";

const REACTION_TYPES = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "clap", emoji: "👏", label: "Clap" },
  { type: "fire", emoji: "🔥", label: "Fire" },
  { type: "think", emoji: "🤔", label: "Thinking" },
] as const;

const REACTED_KEY = "byteverse-reacted";

function getReactedTypes(slug: string): Set<string> {
  try {
    const data = JSON.parse(localStorage.getItem(REACTED_KEY) || "{}");
    return new Set(data[slug] || []);
  } catch {
    return new Set();
  }
}

function saveReactedType(slug: string, type: string) {
  try {
    const data = JSON.parse(localStorage.getItem(REACTED_KEY) || "{}");
    if (!data[slug]) data[slug] = [];
    if (!data[slug].includes(type)) data[slug].push(type);
    localStorage.setItem(REACTED_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function Reactions({ slug }: { slug: string }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [reacted, setReacted] = useState<Set<string>>(new Set());
  const [animating, setAnimating] = useState<string | null>(null);

  useEffect(() => {
    setReacted(getReactedTypes(slug));
    fetch(`/api/reactions?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => setCounts(d.reactions || {}))
      .catch(() => {});
  }, [slug]);

  const react = useCallback(
    async (type: string) => {
      if (reacted.has(type)) return; // already reacted with this type

      // Optimistic update
      setCounts((prev) => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
      setReacted((prev) => new Set([...prev, type]));
      saveReactedType(slug, type);
      setAnimating(type);
      setTimeout(() => setAnimating(null), 600);

      try {
        const res = await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, type }),
        });
        const data = await res.json();
        if (data.reactions) setCounts(data.reactions);
      } catch {
        // Keep optimistic state
      }
    },
    [slug, reacted]
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">React</span>
      {REACTION_TYPES.map((r) => {
        const count = counts[r.type] || 0;
        const hasReacted = reacted.has(r.type);
        const isAnimating = animating === r.type;

        return (
          <button
            key={r.type}
            onClick={() => react(r.type)}
            disabled={hasReacted}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
              hasReacted
                ? "bg-primary/10 ring-1 ring-primary/30 text-primary"
                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground hover:scale-105"
            } ${isAnimating ? "scale-125" : ""}`}
            title={r.label}
            style={{ transition: "all 0.2s ease" }}
          >
            <span className={`text-base ${isAnimating ? "animate-bounce" : ""}`}>{r.emoji}</span>
            {count > 0 && <span className="text-xs font-semibold">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
